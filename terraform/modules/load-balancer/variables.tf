
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "vpc_id" {
  description = "VPC containing the ALB and application targets"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the internet-facing ALB"
  type        = list(string)

  validation {
    condition     = length(var.public_subnet_ids) >= 2
    error_message = "The ALB requires at least two public subnets."
  }
}

variable "alb_security_group_id" {
  description = "Security group assigned to the ALB"
  type        = string
}

variable "app_port" {
  description = "Port used by the application instances"
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "HTTP path used to check application health"
  type        = string
  default     = "/health"
}

variable "common_tags" {
  description = "Common tags applied to load-balancer resources"
  type        = map(string)
  default     = {}
}
