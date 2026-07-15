output "key_arn" {
  value       = aws_kms_key.primary.arn
  description = "The ARN of the KMS key"
}

output "key_id" {
  value       = aws_kms_key.primary.key_id
  description = "The key ID"
}
