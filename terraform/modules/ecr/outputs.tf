output "repository_name" {
  description = "Name of the application ECR repository"
  value       = aws_ecr_repository.app.name
}

output "repository_url" {
  description = "URI of the application ECR repository"
  value       = aws_ecr_repository.app.repository_url
}