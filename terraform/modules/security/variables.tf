
variable "project_name" {
  description = "Name used to identify project resources"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where security groups will be created"
  type        = string
}

variable "allowed_http_cidr" {
  description = "CIDR range allowed to access the public ALB over HTTP"
  type        = string
  default     = "0.0.0.0/0"
}

variable "app_port" {
  description = "Port on which the application listens inside the EC2 instance"
  type        = number
  default     = 3000
}

variable "common_tags" {
  description = "Common tags applied to security resources"
  type        = map(string)
  default     = {}
}
