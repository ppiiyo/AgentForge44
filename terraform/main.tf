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

# --- VPC Module ---
module "vpc_infrastructure" {
  source          = "./modules/vpc"
  vpc_name        = "kostromai4444-production-vpc"
  vpc_cidr        = "10.0.0.0/16"
  cluster_name    = "kostromai4444-production"
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# --- KMS Cryptographic Keys Module ---
module "kms_cryptography" {
  source           = "./modules/kms"
  description      = "KMS Key for encryption at rest across PostgreSQL, Redis, and Web Volumes"
  environment      = "production"
  application_name = "kostromai4444"
}

# --- EKS Kubernetes Engine Module ---
module "eks_cluster" {
  source               = "./modules/eks"
  cluster_name         = "kostromai4444-production"
  cluster_version      = "1.29"
  vpc_id               = module.vpc_infrastructure.vpc_id
  subnet_ids           = module.vpc_infrastructure.private_subnets
  system_min_size      = 3
  system_max_size      = 5
  system_desired_size  = 3
  system_instance_types = ["m6i.large"]
  workloads_min_size   = 5
  workloads_max_size   = 50
  workloads_desired_size = 5
  workloads_instance_types = ["c6i.xlarge"]
}

# --- PostgreSQL RDS Module ---
module "rds_postgres" {
  source                  = "./modules/rds"
  db_name                 = "kostromai4444"
  vpc_id                  = module.vpc_infrastructure.vpc_id
  subnet_ids              = module.vpc_infrastructure.private_subnets
  allowed_security_groups = [module.eks_cluster.node_security_group_id]
  allocated_storage       = 100
  max_allocated_storage   = 1000
  engine_version          = "16.1"
  instance_class          = "db.m6g.xlarge"
  username                = "kostromai44_admin"
  password                = var.database_password
  kms_key_arn             = module.kms_cryptography.key_arn
}

# --- ElastiCache Redis Cluster Module ---
module "redis_cache" {
  source                  = "./modules/redis"
  cluster_name            = "kostromai4444"
  subnet_ids              = module.vpc_infrastructure.private_subnets
  security_group_ids      = [module.rds_postgres.db_security_group_id]
  node_type               = "cache.m6g.large"
  port                    = 6379
  parameter_group_name    = "default.redis7.cluster.on"
  num_node_groups         = 3
  replicas_per_node_group = 1
  kms_key_arn             = module.kms_cryptography.key_arn
}
