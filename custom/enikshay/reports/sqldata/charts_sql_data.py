from sqlagg.columns import CountColumn

from corehq.apps.reports.sqlreport import DatabaseColumn
from custom.enikshay.reports.generic import EnikshaySqlData
from custom.enikshay.reports.utils import convert_to_raw_filters_list


class ChartsSqlData(EnikshaySqlData):

    @property
    def columns(self):
        return [
            DatabaseColumn(
                '',
                CountColumn(
                    'doc_id',
                    filters=self.filters + convert_to_raw_filters_list(
                        "current_episode_type = 'confirmed_tb'", "previous_tb_treatment = 'no'"
                    ),
                    alias='cat1_patients'
                )
            ),
            DatabaseColumn(
                '',
                CountColumn(
                    'doc_id',
                    filters=self.filters + convert_to_raw_filters_list(
                        "current_episode_type = 'confirmed_tb'", "previous_tb_treatment = 'yes'"
                    ),
                    alias='cat2_patients'
                )
            ),
            DatabaseColumn(
                '',
                CountColumn(
                    'doc_id',
                    filters=convert_to_raw_filters_list(
                        "current_episode_type = 'confirmed_tb'"
                    ),
                    alias='total_patients'
                )
            ),

        ]
