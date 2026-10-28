
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  availability_zones = slice(
    data.aws_availability_zones.available.names,
    0,
    2
  )

  common_tags = {
    Project     = var.project_name
    Environment = "dev"
    ManagedBy   = "Terraform"
  }

  public_subnets = {
    for name, subnet in var.subnets :
    name => subnet if subnet.tier == "public"
  }

  private_subnets = {
    for name, subnet in var.subnets :
    name => subnet if subnet.tier == "private"
  }

  container_image = var.image_tag == "" ? "" : "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-app:${var.image_tag}"

}

data "aws_caller_identity" "current" {}


# -----------------------------
# VPC
# -----------------------------

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-vpc"
  })
}

# -----------------------------
# Internet Gateway
# -----------------------------

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-igw"
  })
}

# -----------------------------
# Subnets
# -----------------------------

resource "aws_subnet" "this" {
  for_each = var.subnets

  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value.cidr_block
  availability_zone       = local.availability_zones[each.value.az_index]
  map_public_ip_on_launch = each.value.tier == "public"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${each.key}"
    Tier = each.value.tier
  })
}

# -----------------------------
# Public Route Table
# -----------------------------

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  for_each = local.public_subnets

  subnet_id      = aws_subnet.this[each.key].id
  route_table_id = aws_route_table.public.id
}

# -----------------------------
# Private Route Tables
# -----------------------------

resource "aws_route_table" "private" {
  for_each = local.private_subnets

  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${each.key}-rt"
  })
}

resource "aws_route_table_association" "private" {
  for_each = local.private_subnets

  subnet_id      = aws_subnet.this[each.key].id
  route_table_id = aws_route_table.private[each.key].id
}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-nat-eip"
  })
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.this["public_a"].id

  depends_on = [aws_internet_gateway.main]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-nat"
  })
}

resource "aws_route" "private_nat" {
  for_each = local.private_subnets

  route_table_id         = aws_route_table.private[each.key].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}
module "security" {
  source = "../../modules/security"

  project_name = var.project_name
  vpc_id       = aws_vpc.main.id
  common_tags  = local.common_tags

  app_port = 3000
}
module "load_balancer" {
  source = "../../modules/load-balancer"

  project_name = var.project_name
  vpc_id       = aws_vpc.main.id

  public_subnet_ids = [
    for name in keys(local.public_subnets) :
    aws_subnet.this[name].id
  ]

  alb_security_group_id = module.security.alb_security_group_id

  app_port          = 3000
  health_check_path = "/health"

  common_tags = local.common_tags
}
module "ecr" {
  source = "../../modules/ecr"

  project_name = var.project_name
  common_tags  = local.common_tags
}
module "compute" {
  count  = var.enable_compute ? 1 : 0
  source = "../../modules/compute"

  project_name = var.project_name
  aws_region   = var.aws_region
  private_subnet_ids = [
    for name in keys(local.private_subnets) :
    aws_subnet.this[name].id
  ]

  app_security_group_id = module.security.app_security_group_id
  target_group_arns     = [module.load_balancer.target_group_arn]
  container_image       = local.container_image

  app_port = 3000

  common_tags = local.common_tags
}

# -----------------------------
# CloudWatch Monitoring
# -----------------------------

module "monitoring" {
  count  = var.enable_compute ? 1 : 0
  source = "../../modules/monitoring"

  project_name = var.project_name

  autoscaling_group_name = module.compute[0].autoscaling_group_name

  load_balancer_arn_suffix = split(
    "loadbalancer/",
    module.load_balancer.alb_arn
  )[1]

  target_group_arn_suffix = split(
    "targetgroup/",
    module.load_balancer.target_group_arn
  )[1]

  common_tags = local.common_tags
}
