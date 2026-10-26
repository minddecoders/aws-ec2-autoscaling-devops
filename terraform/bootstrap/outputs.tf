
output "github_ecr_push_role_arn" {
  description = "IAM role ARN for GitHub Actions to push Docker images"
  value       = aws_iam_role.github_ecr_push.arn
}

output "github_terraform_role_arn" {
  description = "IAM role ARN for GitHub Actions to manage infrastructure"
  value       = aws_iam_role.github_terraform.arn
}

output "ecr_repository_name" {
  description = "Name of the application's ECR repository"
  value       = var.ecr_repository_name
}

output "terraform_state_bucket_name" {
  description = "S3 bucket used for Terraform state"
  value       = aws_s3_bucket.terraform_state.bucket
}
