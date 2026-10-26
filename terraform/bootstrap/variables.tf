
variable "aws_region" {
  description = "AWS region for this project"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Project identifier"
  type        = string
  default     = "aws-ec2-autoscaling-devops"
}

variable "github_owner" {
  description = "GitHub repository owner or organization"
  type        = string
  default     = "minddecoders"
}

variable "github_repository" {
  description = "GitHub repository name"
  type        = string
  default     = "aws-ec2-autoscaling-devops"
}

variable "github_branch" {
  description = "Branch permitted to assume the publishing role"
  type        = string
  default     = "main"
}

variable "ecr_repository_name" {
  description = "Name of the application's ECR repository"
  type        = string
  default     = "aws-ec2-autoscaling-devops-app"
}
