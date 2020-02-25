from django.core.exceptions import ValidationError
from enum import Enum


class Status(Enum):
    SUCCESS = "SUCCESS: "
    ERROR = "ERROR: "
    CREATE_ERROR = "CREATE ERROR: "
    DELETE_ERROR = "DELETE ERROR: "
    MODIFY_ERROR = "MODIFY ERROR: "
    INVALID_INPUT = "INVALID INPUT: "
    CONNECTION = "CONNECTION ERROR: "


class GenericFailure(Enum):
    UNKNOWN = "Unknown internal error."
    DOES_NOT_EXIST = " does not exist."
    FILTER = "Invalid filter applied."
    SORT = "Invalid sort applied."
    INVALID_DATA = "Required values are missing or invalid."


class UserFailure(Enum):
    DELETE = "Cannot delete user"
    NETID_LOGIN = \
        "The Duke NetID login credentials you have provided are invalid."


class PowerFailure(Enum):
    CONNECTION = "Unable to contact PDU controller. Please try again later."


def get_rack_failure_message(range_serializer, action):
    failure_message = \
        "Racks " + \
        range_serializer.get_range_as_string() + \
        " cannot be " + action + " in datacenter " + \
        range_serializer.get_datacenter().abbreviation
    return failure_message


def get_rack_exist_failure(racks):
    if len(racks) < 5:
        failure_message = \
            " because the following racks already exist: " + \
            get_rack_list(racks)
    else:
        failure_message = \
            " because at least the following racks already exist: " + \
            get_rack_list(racks[0:5]) + ", ..."
    return failure_message


def get_rack_do_not_exist_failure(rack_names):
    if len(rack_names) < 5:
        failure_message = \
            " because the following racks do not exist: " + \
            ", ".join(rack_names)
    else:
        failure_message = \
            " because at least the following racks do not exist: " + \
            ", ".join(rack_names[0:5]) + ", ..."
    return failure_message


def get_rack_with_asset_failure(racks):
    if len(racks) < 5:
        failure_message = \
            " because the following racks contain assets: "
        failure_message += get_rack_list(racks)
    else:
        failure_message = \
            " because at least the following racks contain assets: "
        failure_message += get_rack_list(racks[0:5]) + ", ..."
    return failure_message


def get_rack_list(racks):
    return ", ".join(
        [str(rack.row_letter) + str(rack.rack_num) for rack in racks]
    )


def parse_serializer_errors(errors):
    failure_messages = []
    error_num = 0
    for field in errors:
        error_num += 1
        field_errors = [str(error) for error in errors[field]]
        failure_messages.append(
            "(" + str(error_num) + ") " + field + ": " + " ".join(field_errors)
        )
    return " ".join(failure_messages)


def parse_validation_error(error):
    failure_detail = ""
    if isinstance(error, ValidationError):
        for err in error:
            failure_detail += err
    else:
        failure_detail = GenericFailure.UNKNOWN.value
    return failure_detail
