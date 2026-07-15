variable "cluster_name" {
  type        = string
  description = "Name identifier for ElastiCache Redis replication group"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Private subnets for Redis instances"
}

variable "security_group_ids" {
  type        = list(string)
  description = "Security group IDs associated with the cluster"
}

variable "description" {
  type        = string
  default     = "High Availability Redis cluster for session memory, cache management, and rate limiting"
}

variable "node_type" {
  type    = string
  default = "cache.m6g.large"
}

variable "port" {
  type    = number
  default = 6379
}

variable "parameter_group_name" {
  type    = string
  default = "default.redis7.cluster.on"
}

variable "num_node_groups" {
  type    = number
  default = 3
}

variable "replicas_per_node_group" {
  type    = number
  default = 1
}

variable "kms_key_arn" {
  type        = string
  description = "KMS ARN key for encrypting Redis data at rest"
}
