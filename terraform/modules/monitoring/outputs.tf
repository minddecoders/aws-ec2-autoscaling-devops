
output "high_cpu_alarm_name" {
  description = "CloudWatch alarm for high EC2 CPU utilization"
  value       = aws_cloudwatch_metric_alarm.high_cpu.alarm_name
}

output "unhealthy_targets_alarm_name" {
  description = "CloudWatch alarm for unhealthy ALB targets"
  value       = aws_cloudwatch_metric_alarm.unhealthy_targets.alarm_name
}

output "http_5xx_alarm_name" {
  description = "CloudWatch alarm for ALB HTTP 5xx errors"
  value       = aws_cloudwatch_metric_alarm.http_5xx.alarm_name
}
