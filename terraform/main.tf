provider "aws" {
  region = "us-east-1"
}

variable "app_zip_url" {
  type        = string
  description = "Pre-signed URL for app.zip"
}

resource "aws_security_group" "game_sg" {
  name        = "clicker_siege_sg_v4"
  description = "Security group for the multiplayer clicker game"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Owner = "ai-agent"
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}

resource "aws_instance" "game_server" {
  ami                  = data.aws_ami.amazon_linux.id
  instance_type        = "t2.micro"
  key_name             = "ec2_ssh"
  vpc_security_group_ids = [aws_security_group.game_sg.id]
  user_data_replace_on_change = true

  user_data = <<-USERDATA
              #!/bin/bash
              yum update -y
              curl -sL https://rpm.nodesource.com/setup_20.x | bash -
              yum install -y nodejs unzip
              
              mkdir -p /opt/app
              cd /opt/app
              curl -o app.zip "${var.app_zip_url}"
              unzip -o app.zip
              # If zip contained a clicker-siege folder, cd into it
              if [ -d "clicker-siege" ]; then
                cd clicker-siege
              fi
              npm install
              npm install -g pm2
              pm2 start server.js
              USERDATA

  tags = {
    Name  = "Clicker Siege Server"
    Owner = "ai-agent"
  }
}

output "game_url" {
  value = "http://${aws_instance.game_server.public_ip}:3000"
}

output "instance_id" {
  value = aws_instance.game_server.id
}
