variable "project_name" {
  description = "Project name used for repository naming"
  type        = string
}

variable "common_tags" {
  description = "Common tags applied to ECR resources"
  type        = map(string)
  default     = {}
}