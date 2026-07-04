# Terraform Production-Grade Enterprise State Setup
terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.29"
    }
  }
  backend "s3" {
    bucket         = "kostromai4444-terraform-state"
    key            = "production/state.tfstate"
    region         = "us-east-1"
    dynamodb_table = "kostromai4444-tflocks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# --- VPC Infrastructure ---
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "kostromai4444-production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true
  enable_dns_hostnames   = true
  enable_dns_support     = true

  public_subnet_tags = {
    "kubernetes.io/cluster/kostromai4444-production" = "shared"
    "kubernetes.io/role/elb"                        = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/cluster/kostromai4444-production" = "shared"
    "kubernetes.io/role/internal-elb"               = "1"
  }
}

# --- KMS Cryptographic Keys ---
resource "aws_kms_key" "primary" {
  description             = "KMS Key for encryption at rest across PostgreSQL, Redis, and Web Volumes"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags = {
    Environment = "production"
    Application = "kostromai4444"
  }
}

# --- EKS Kubernetes Engine ---
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "kostromai4444-production"
  cluster_version = "1.29"

  cluster_endpoint_public_access = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    system = {
      min_size     = 3
      max_size     = 5
      desired_size = 3

      instance_types = ["m6i.large"]
      capacity_type  = "ON_DEMAND"
    }
    workloads = {
      min_size     = 5
      max_size     = 50
      desired_size = 5

      instance_types = ["c6i.xlarge"]
      capacity_type  = "ON_DEMAND"
    }
  }
}

# --- PostgreSQL Primary RDS Database ---
resource "aws_db_subnet_group" "db_subnets" {
  name       = "kostromai4444-db-subnets"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "db_sg" {
  name        = "kostromai4444-db-security-group"
  description = "Controls PostgreSQL ingress routing rules"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "postgres" {
  identifier           = "kostromai4444-production-rds"
  allocated_storage    = 100
  max_allocated_storage = 1000
  storage_type         = "gp3"
  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = "db.m6g.xlarge"
  db_name              = "kostromai4444"
  username             = "kostromai44_admin"
  password             = var.database_password # Loaded securely via sensitive variable
  parameter_group_name = "default.postgres16"
  db_subnet_group_name = aws_db_subnet_group.db_subnets.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  
  multi_az             = true
  storage_encrypted    = true
  kms_key_id           = aws_kms_key.primary.arn
  
  backup_retention_period = 35
  backup_window           = "02:00-03:00"
  maintenance_window      = "Sun:04:00-Sun:05:00"

  skip_final_snapshot = false
  final_snapshot_identifier = "kostromai4444-rds-final-snapshot"
}

# --- ElastiCache Redis HA Cluster ---
resource "aws_elasticache_subnet_group" "redis_subnets" {
  name       = "kostromai4444-redis-subnets"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id        = "kostromai4444-redis-cluster"
  description                 = "High Availability Redis cluster for session memory, cache management, and rate limiting"
  node_type                   = "cache.m6g.large"
  port                        = 6379
  parameter_group_name        = "default.redis7.cluster.on"
  subnet_group_name           = aws_elasticache_subnet_group.redis_subnets.name
  security_group_ids          = [aws_security_group.db_sg.id] # Shares EKS access controls

  num_node_groups             = 3
  replicas_per_node_group     = 1
  
  automatic_failover_enabled  = true
  multi_az_enabled            = true
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  kms_key_id                  = aws_kms_key.primary.arn
}
