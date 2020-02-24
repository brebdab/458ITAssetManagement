from datetime import datetime
from django.contrib.auth.models import User
from enum import Enum
from rackcity.models import Log, Asset, ITModel, Datacenter


class Action(Enum):
    CREATE = "created"
    MODIFY = "modified"
    DELETE = "deleted"


class PermissionAction(Enum):
    REVOKE = "revoked admin permission from"
    GRANT = "granted admin permission to"


class PowerAction(Enum):
    ON = "turned on"
    OFF = "turned off"
    CYCLE = "cycled"


class ElementType(Enum):
    ASSET = "asset"
    DATACENTER = "datacenter"
    MODEL = "model"
    USER = "user"
    NETWORK_CONNECTIONS = "network connections"


def datetime_to_string(date):
    return "[" + str(date) + "]"


def log_action(user, related_element, action):
    """
    Specified action should be Action enum.
    """
    date = datetime.now()
    related_model = None
    related_asset = None
    if isinstance(related_element, Asset):
        element_type = ElementType.ASSET.value
        element_name = str(related_element.asset_number)
        if (related_element.hostname):
            element_name += (' (' + related_element.hostname + ')')
        related_asset = related_element
    elif isinstance(related_element, ITModel):
        element_type = ElementType.MODEL.value
        element_name = " ".join([
            related_element.vendor,
            related_element.model_number
        ])
        related_model = related_element
    elif isinstance(related_element, User):
        element_type = ElementType.USER.value
        element_name = related_element.username
    elif isinstance(related_element, Datacenter):
        element_type = ElementType.DATACENTER.value
        element_name = related_element.abbreviation
    log_content = " ".join([
        datetime_to_string(date),
        element_type,
        element_name + ":",
        "user",
        user.username,
        action.value,
        element_type,
        element_name
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
        related_asset=related_asset,
        related_model=related_model,
    )
    log.save()


def log_delete(user, element_type, element_name):
    """
    Specified element_type should be ElementType enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        element_type.value,
        element_name + ":",
        "user",
        user.username,
        Action.DELETE.value,
        element_type.value,
        element_name
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()


def log_rack_action(user, action, related_racks):
    """
    Specified action should be Action enum, related_racks should be list of
    rack strings such as ['A1','A2',...]
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        "user",
        user.username,
        action.value,
        "the following racks:",
        related_racks,
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()


def log_user_permission_action(user, permission_action, username):
    """
    Specified permission_action should be PermissionAction enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        "user",
        user.username,
        permission_action.value,
        "user",
        username,
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()


def log_power_action(user, power_action, related_asset):
    """
    Specified power_action should be PowerAction enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        ElementType.ASSET.value,
        related_asset.asset_number + ":",
        "user",
        user.username,
        power_action.value,
        "for asset",
        related_asset.asset_number,
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
        related_asset=related_asset,
    )
    log.save()


def log_network_action(user, action, asset_0, asset_1):
    """
    Specified action should be Action enum.
    """
    date = datetime.now()
    log_single_network_action(date, user, action, asset_0, asset_1)
    log_single_network_action(date, user, action, asset_1, asset_0)


def log_single_network_action(date, user, action, related_asset, other_asset):
    """
    Specified action should be Action enum.
    """
    log_content = " ".join([
        datetime_to_string(date),
        ElementType.ASSET.value,
        related_asset.asset_number + ":",
        "a network connection from asset",
        related_asset.asset_number,
        "to asset",
        other_asset.asset_number,
        "has been",
        action.value
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
        related_asset=related_asset,
    )
    log.save()


def log_bulk_import(user, element_type):
    """
    Specified element_type should be ElementType enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        "user",
        user.username,
        "uploaded",
        element_type.value,
        "by bulk import",
    ])
