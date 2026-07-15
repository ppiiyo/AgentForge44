resource "aws_db_subnet_group" "db_subnets" {
  name       = "${var.db_name}-db-subnets"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "db_sg" {
  name        = "${var.db_name}-db-security-group"
  description = "Controls PostgreSQL ingress routing rules"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "postgres" {
  identifier           = "${var.db_name}-production-rds"
  allocated_storage    = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type         = "gp3"
  engine               = "postgres"
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  db_name              = var.db_name
  username             = var.username
  password             = var.password
  parameter_group_name = var.parameter_group_name
  db_subnet_group_name = aws_db_subnet_group.db_subnets.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  
  multi_az             = true
  storage_encrypted    = true
  kms_key_id           = var.kms_key_arn
  
  backup_retention_period = 35
  backup_window           = "02:00-03:00"
  maintenance_window      = "Sun:04:00-Sun:05:00"

  skip_final_snapshot = false
  final_snapshot_identifier = "${var.db_name}-rds-final-snapshot"
}
