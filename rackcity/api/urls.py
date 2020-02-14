from django.urls import path
from rackcity import views

urlpatterns = [
    path('models', views.model_list),
    path('models/add', views.model_add),
    path('models/modify', views.model_modify),
    path('models/delete', views.model_delete),
    path('models/get-many', views.model_many),
    path('models/<int:id>', views.model_detail),
    path('models/vendors', views.model_vendors),
    path('models/bulk-upload', views.model_bulk_upload),
    path('models/bulk-approve', views.model_bulk_approve),
    path('models/bulk-export', views.model_bulk_export),
    path('models/pages', views.model_page_count),
    path('models/fields', views.model_fields),
    path('models/test-auth', views.model_auth),
    path('models/test-admin', views.model_admin),
    path('instances', views.instance_list),
    path('instances/get-many', views.instance_many),
    path('instances/<int:id>', views.instance_detail),
    path('instances/add', views.instance_add),
    path('instances/modify', views.instance_modify),
    path('instances/delete', views.instance_delete),
    path('instances/bulk-upload', views.instance_bulk_upload),
    path('instances/bulk-approve', views.instance_bulk_approve),
    path('instances/bulk-export', views.instance_bulk_export),
    path('instances/pages', views.instance_page_count),
    path('instances/fields', views.instance_fields),
    path('racks/get', views.rack_get),
    path('racks/create', views.rack_create),
    path('racks/delete', views.rack_delete),
    path('racks/summary', views.rack_summary),
    path('iamadmin', views.i_am_admin),
    path('report', views.report_rack_usage),
    path('usernames', views.usernames),
    path('datacenters/get-all', views.datacenter_all)
]
