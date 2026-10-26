
variable "project_name" {
  description = "Project name used for AWS resource naming"
  type        = string
}

variable "aws_region" {
  description = "AWS region where EC2 instances will run"
  type        = string
  default     = "eu-west-1"
}

variable "private_subnet_ids" {
  description = "IDs of private subnets for the Auto Scaling Group"
  type        = list(string)
}

variable "app_security_group_id" {
  description = "Security group ID assigned to application instances"
  type        = string
}

variable "target_group_arns" {
  description = "ALB target group ARNs attached to the Auto Scaling Group"
  type        = list(string)
  default     = []
}

variable "container_image" {
  description = "Full private ECR image URI, including its tag"
  type        = string

  validation {
    condition     = trimspace(var.container_image) != ""
    error_message = "Provide a complete ECR image URI, including its immutable tag, before enabling compute."
  }
}

variable "app_port" {
  description = "Port exposed by the application container"
  type        = number
  default     = 3000
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "min_size" {
  description = "Minimum number of EC2 instances"
  type        = number
  default     = 1
}

variable "desired_capacity" {
  description = "Desired number of EC2 instances"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum number of EC2 instances"
  type        = number
  default     = 2
}

variable "common_tags" {
  description = "Common tags applied to compute resources"
  type        = map(string)
  default     = {}
}


