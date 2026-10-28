
variable "project_name" {
  description = "Project name used to identify monitoring resources"
  type        = string
}

variable "autoscaling_group_name" {
  description = "Name of the application Auto Scaling Group"
  type        = string
}

variable "load_balancer_arn_suffix" {
  description = "Application Load Balancer ARN suffix"
  type        = string
}

variable "target_group_arn_suffix" {
  description = "Application target group ARN suffix"
  type        = string
}

variable "common_tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}

variable "cpu_alarm_threshold" {
  description = "CPU utilization percentage that triggers an alarm"
  type        = number
  default     = 70
}
