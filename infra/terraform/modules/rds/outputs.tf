output "db_instance_arn" {
  value       = aws_db_instance.postgres.arn
  description = "ARN of the RDS database"
}

output "db_instance_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "Connection endpoint of the database instance"
}

output "db_security_group_id" {
  value       = aws_security_group.db_sg.id
  description = "ID of the RDS security group"
}
