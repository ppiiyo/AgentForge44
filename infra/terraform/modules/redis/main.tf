resource "aws_elasticache_subnet_group" "redis_subnets" {
  name       = "${var.cluster_name}-redis-subnets"
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id        = "${var.cluster_name}-redis-cluster"
  description                 = var.description
  node_type                   = var.node_type
  port                        = var.port
  parameter_group_name        = var.parameter_group_name
  subnet_group_name           = aws_elasticache_subnet_group.redis_subnets.name
  security_group_ids          = var.security_group_ids

  num_node_groups             = var.num_node_groups
  replicas_per_node_group     = var.replicas_per_node_group
  
  automatic_failover_enabled  = true
  multi_az_enabled            = true
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  kms_key_id                  = var.kms_key_arn
}
