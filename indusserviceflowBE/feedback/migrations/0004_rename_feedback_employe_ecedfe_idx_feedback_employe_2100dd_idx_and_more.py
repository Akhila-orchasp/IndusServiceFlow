from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        (
            "feedback",
            "0003_rename_feedbackreq_token_03edb4_idx_feedbackreq_token_39229d_idx_and_more",
        ),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=[
                        """
                        ALTER TABLE `feedback`
                        RENAME INDEX `Feedback_Employe_ecedfe_idx`
                        TO `feedback_Employe_2100dd_idx`
                        """,
                        """
                        ALTER TABLE `feedback`
                        RENAME INDEX `Feedback_Appoint_91eaa4_idx`
                        TO `feedback_Appoint_678773_idx`
                        """,
                        """
                        ALTER TABLE `feedback`
                        RENAME INDEX `Feedback_OrgId_4e2e73_idx`
                        TO `feedback_OrgId_6b4121_idx`
                        """,
                    ],
                    reverse_sql=[
                        """
                        ALTER TABLE `feedback`
                        RENAME INDEX `feedback_Employe_2100dd_idx`
                        TO `Feedback_Employe_ecedfe_idx`
                        """,
                        """
                        ALTER TABLE `feedback`
                        RENAME INDEX `feedback_Appoint_678773_idx`
                        TO `Feedback_Appoint_91eaa4_idx`
                        """,
                        """
                        ALTER TABLE `feedback`
                        RENAME INDEX `feedback_OrgId_6b4121_idx`
                        TO `Feedback_OrgId_4e2e73_idx`
                        """,
                    ],
                ),
            ],
            state_operations=[
                migrations.AlterModelTable(
                    name="feedback",
                    table="feedback",
                ),
            ],
        ),
    ]