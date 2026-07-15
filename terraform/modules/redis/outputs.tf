output "redis_replication_group_id" {
  value       = aws_elasticache_replication_group.redis.id
  description = "The ID of the ElastiCache replication group"
}

output "redis_primary_endpoint" {
  value       = aws_elasticache_replication_group.redis.configuration_endpoint_address
  description = "The configuration endpoint address for connecting to the Redis cluster"
}
