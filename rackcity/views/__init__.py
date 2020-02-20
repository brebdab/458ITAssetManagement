from .log_views import log_many
from .it_model_views import (
    model_add,
    model_modify,
    model_delete,
    model_many,
    model_detail,
    model_vendors,
    model_bulk_upload,
    model_bulk_approve,
    model_bulk_export,
    model_page_count,
    model_fields,
    model_list,
    model_auth,
    model_admin,
)
from .asset_views import (
    asset_detail,
    asset_list,
    asset_add,
    asset_modify,
    asset_delete,
    asset_many,
    asset_bulk_upload,
    asset_bulk_approve,
    asset_bulk_export,
    network_bulk_upload,
    network_bulk_export,
    asset_page_count,
    asset_fields,
)
from .rack_views import (
    rack_get,
    rack_get_all,
    rack_create,
    rack_delete,
    rack_summary,
)
from .report_views import report_rack_usage
from .user_views import (
    netid_login,
    RegisterNameView,
    user_delete,
    user_list,
    user_page_count,
    usernames,
    who_am_i,
    i_am_admin,
    user_grant_admin,
    user_revoke_admin,
)
from .datacenter_views import (
    datacenter_all,
    datacenter_create,
    datacenter_delete,
    datacenter_page_count,
    datacenter_modify
)
from .pdu_views import (
    power_status
)
