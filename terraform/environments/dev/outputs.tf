
output "vpc_id" {
  description = "ID of the project VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the project VPC"
  value       = aws_vpc.main.cidr_block
}

output "availability_zones" {
  description = "Availability Zones used by this deployment"
  value       = local.availability_zones
}

output "public_subnet_ids" {
  description = "Subnet names and IDs for public subnets"

  value = {
    for name, subnet in aws_subnet.this :
    name => subnet.id if var.subnets[name].tier == "public"
  }
}

output "private_subnet_ids" {
  description = "Subnet names and IDs for private subnets"

  value = {
    for name, subnet in aws_subnet.this :
    name => subnet.id if var.subnets[name].tier == "private"
  }
}
output "ecr_repository_name" {
  description = "Name of the application container repository"
  value       = module.ecr.repository_name
}

output "ecr_repository_url" {
  description = "URL used to push and pull application images"
  value       = module.ecr.repository_url
}

output "autoscaling_group_name" {
  description = "Name of the application Auto Scaling Group"
  value       = var.enable_compute ? module.compute[0].autoscaling_group_name : null
}

output "ec2_iam_role_name" {
  description = "IAM role assumed by application EC2 instances"
  value       = var.enable_compute ? module.compute[0].ec2_iam_role_name : null
}

output "ubuntu_ami_id" {
  description = "Canonical Ubuntu 22.04 AMI selected for the compute instances"
  value       = var.enable_compute ? module.compute[0].ami_id : null
}

output "cloudwatch_high_cpu_alarm_name" {
  description = "CloudWatch alarm for high EC2 CPU utilization"
  value       = var.enable_compute ? module.monitoring[0].high_cpu_alarm_name : null
}

output "cloudwatch_unhealthy_targets_alarm_name" {
  description = "CloudWatch alarm for unhealthy ALB targets"
  value       = var.enable_compute ? module.monitoring[0].unhealthy_targets_alarm_name : null
}

output "cloudwatch_http_5xx_alarm_name" {
  description = "CloudWatch alarm for ALB HTTP 5xx errors"
  value       = var.enable_compute ? module.monitoring[0].http_5xx_alarm_name : null
}
output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = var.enable_compute ? module.monitoring[0].dashboard_name : null
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = var.enable_compute ? "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${module.monitoring[0].dashboard_name}" : null
}