
output "launch_template_id" {
  description = "ID of the EC2 launch template"
  value       = aws_launch_template.app.id
}

output "autoscaling_group_name" {
  description = "Name of the application Auto Scaling Group"
  value       = aws_autoscaling_group.app.name
}

output "ec2_iam_role_name" {
  description = "IAM role assumed by application EC2 instances"
  value       = aws_iam_role.ec2.name
}

output "ami_id" {
  description = "Ubuntu AMI selected in the configured AWS region"
  value       = data.aws_ami.ubuntu.id
}
