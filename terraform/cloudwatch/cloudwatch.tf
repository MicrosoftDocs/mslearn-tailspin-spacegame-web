#resource "aws_sns_topic" "cloudwatch_notifications" {
#  name = "${var.environment}-cloudwatch-${var.cliente}-notifications"
#}

#module "sns" {
#  source = "git::https://github.com/terraform-aws-modules/terraform-aws-sns"
#  name = "${var.environment}-cloudwatch-${var.cliente}-notifications"
#}



#resource "aws_sns_topic_subscription" "teams_subscription" {
#  topic_arn = module.sns.topic_arn
#  protocol  = "https"
#  endpoint  = "https://outlook.office.com/webhook/sua-url-do-webhook-do-teams"
#}

#resource "aws_cloudwatch_metric_alarm" "ebs_disk_alarm" {
#  alarm_name          = "${var.environment}-${var.cliente == "" ? "stoque" : var.cliente}-ebs-disk-alarm"
#  comparison_operator = "GreaterThanOrEqualToThreshold"
#  evaluation_periods  = 1
#  metric_name         = "FreeStorageSpace"
#  namespace           = "AWS/EBS"
#  period              = 300
#  statistic           = "Average"
#  threshold           = 20  # Defina o limite de espaço em disco livre em porcentagem

#  dimensions = {
#    VolumeId = "vol-02573311ac496e544"
#  }

#  alarm_description = "Este alarme é acionado quando o espaço em disco livre cai abaixo de 20%."

#  alarm_actions = ["${module.sns.topic_arn}"]

#}

resource "aws_organizations_account" "account" {
  name  = "jujuba"
  email = "matheushfbrandao@outlook.com"
}