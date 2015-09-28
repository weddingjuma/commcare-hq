from django.conf.urls import *
from corehq.apps.export.views import (
    CreateCustomFormExportView,
    CreateCustomCaseExportView,
    EditCustomFormExportView,
    EditCustomCaseExportView,
    DeleteCustomExportView,
    DownloadFormExportView,
    DownloadCaseExportView,
    FormExportListView,
    CaseExportListView,
    BulkDownloadFormExportView,
    BulkDownloadCaseExportView,
)

urlpatterns = patterns(
    'corehq.apps.export.views',
    url(r"^custom/form/$", FormExportListView.as_view(), name=FormExportListView.urlname),
    url(r"^custom/case/$", CaseExportListView.as_view(), name=CaseExportListView.urlname),
    url(r"^custom/form/create$", CreateCustomFormExportView.as_view(), name=CreateCustomFormExportView.urlname),
    url(r"^custom/case/create$", CreateCustomCaseExportView.as_view(), name=CreateCustomCaseExportView.urlname),
    url(r"^custom/form/download/bulk/$",
        BulkDownloadFormExportView.as_view(), name=BulkDownloadFormExportView.urlname),
    url(r"^custom/form/download/(?P<export_id>[\w\-]+)/$",
        DownloadFormExportView.as_view(), name=DownloadFormExportView.urlname),
    url(r"^custom/form/edit/(?P<export_id>[\w\-]+)/$", EditCustomFormExportView.as_view(),
        name=EditCustomFormExportView.urlname),
    url(r"^custom/case/download/bulk/$",
        BulkDownloadCaseExportView.as_view(), name=BulkDownloadCaseExportView.urlname),
    url(r"^custom/case/download/(?P<export_id>[\w\-]+)/$",
        DownloadCaseExportView.as_view(), name=DownloadCaseExportView.urlname),
    url(r"^custom/case/edit/(?P<export_id>[\w\-]+)/$", EditCustomCaseExportView.as_view(),
        name=EditCustomCaseExportView.urlname),
    url(r"^custom/delete/(?P<export_id>[\w\-]+)/$", DeleteCustomExportView.as_view(), name=DeleteCustomExportView.urlname),
)
