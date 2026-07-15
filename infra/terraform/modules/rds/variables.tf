variable "db_name" {
  type        = string
  description = "Name of the PostgreSQL database"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Private subnets for RDS DB instance"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "allowed_security_groups" {
  type        = list(string)
  description = "Security groups allowed to access Postgres port 5432"
}

variable "allocated_storage" {
  type    = number
  default = 100
}

variable "max_allocated_storage" {
  type    = number
  default = 1000
}

variable "engine_version" {
  type    = string
  default = "16.1"
}

variable "instance_class" {
  type    = string
  default = "db.m6g.xlarge"
}

variable "username" {
  type    = string
  default = "kostromai44_admin"
}

variable "password" {
  type      = string
  sensitive = true
}

variable "parameter_group_name" {
  type    = string
  default = "default.postgres16"
}

variable "kms_key_arn" {
  type        = string
  description = "KMS Key ARN for storage encryption"
}
