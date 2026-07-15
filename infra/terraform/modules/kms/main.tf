resource "aws_kms_key" "primary" {
  description             = var.description
  deletion_window_in_days = var.deletion_window_in_days
  enable_key_rotation     = true
  tags = {
    Environment = var.environment
    Application = var.application_name
  }
}
