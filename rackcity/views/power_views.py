from django.http import JsonResponse
from rackcity.models import Rack, Asset, PowerPort, PowerPortCP
from rackcity.api.serializers import serialize_power_connections
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    PowerFailure,
    AuthFailure,
)
from rackcity.utils.log_utils import (
    log_power_action,
    PowerAction,
)
from rackcity.permissions.permissions import user_has_power_permission
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes, api_view
from http import HTTPStatus
import re
import requests
import time
from requests.exceptions import ConnectionError
from rackcity.models.asset import get_assets_for_cp
from rackcity.utils.change_planner_utils import get_change_plan
from rackcity.utils.exceptions import ChassisPowerManagementException
import os
from django.core.exceptions import ObjectDoesNotExist


pdu_url = "http://hyposoft-mgt.colab.duke.edu:8005/"
# Need to specify rack + side in request, e.g. for A1 left, use A01L
get_pdu = "pdu.php?pdu=hpdu-rtp1-"
toggle_pdu = "power.php"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pdu_power_status(request, id):
    """
    Get status of all power ports for an asset in
    network controlled PDU datacenter.
    """
    try:
        asset = Asset.objects.get(id=id)
    except Asset.DoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value
                + "Asset"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing asset with id=" + str(id),
            },
            status=HTTPStatus.BAD_REQUEST,
        )

    power_connections = serialize_power_connections(PowerPort, asset)

    # get string parameter representing rack number (i.e. A01<L/R>)
    rack_str = str(asset.rack.row_letter)
    if (asset.rack.rack_num / 10) < 1:
        rack_str = rack_str + "0"
    rack_str = rack_str + str(asset.rack.rack_num)

    power_status = dict()
    if asset.rack.is_network_controlled:
        for power_connection in power_connections:
            try:
                html = requests.get(
                    pdu_url
                    + get_pdu
                    + rack_str
                    + str(power_connections[power_connection]["left_right"]),
                    timeout=5,
                )
            except ConnectionError:
                return JsonResponse(
                    {
                        "failure_message": Status.CONNECTION.value
                        + PowerFailure.CONNECTION.value
                    },
                    status=HTTPStatus.REQUEST_TIMEOUT,
                )
            power_status[power_connection] = regex_power_status(
                html.text, power_connections[power_connection]["port_number"]
            )[0]

    return JsonResponse(
        {"power_connections": power_connections, "power_status": power_status},
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pdu_power_on(request):
    """
    Turn on power to specified port
    """
    data = JSONParser().parse(request)
    if "id" not in data.keys():
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "No asset 'id' given",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        asset = Asset.objects.get(id=data["id"])
    except Asset.DoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value
                + "Asset"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing asset with id=" + str(data["id"]),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if not user_has_power_permission(request.user, asset=asset):
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.POWER.value,
                "errors": "User "
                + request.user.username
                + " does not have power permission and does not own"
                + " asset with id="
                + str(data["id"]),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    power_connections = serialize_power_connections(PowerPort, asset)
    # Check power is off
    for connection in power_connections:
        try:
            html = requests.get(
                pdu_url
                + get_pdu
                + get_pdu_status_ext(
                    asset, str(power_connections[connection]["left_right"])
                )
            )
        except ConnectionError:
            return JsonResponse(
                {
                    "failure_message": Status.CONNECTION.value
                    + PowerFailure.CONNECTION.value
                },
                status=HTTPStatus.REQUEST_TIMEOUT,
            )
        power_status = regex_power_status(
            html.text, power_connections[connection]["port_number"]
        )[0]
        if power_status != "ON":
            toggle_pdu_power(asset, connection, "on")
    log_power_action(
        request.user, PowerAction.ON, asset,
    )
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + "Power turned on."},
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pdu_power_off(request):
    """
    Turn on power to specified port
    """
    data = JSONParser().parse(request)
    if "id" not in data.keys():
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "No asset 'id' given",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        asset = Asset.objects.get(id=data["id"])
    except Asset.DoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value
                + "Asset"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing asset with id=" + str(data["id"]),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if not user_has_power_permission(request.user, asset=asset):
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.POWER.value,
                "errors": "User "
                + request.user.username
                + " does not have power permission and does not own"
                + " asset with id="
                + str(data["id"]),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    power_connections = serialize_power_connections(PowerPort, asset)
    # Check power is off
    for connection in power_connections:
        try:
            html = requests.get(
                pdu_url
                + get_pdu
                + get_pdu_status_ext(
                    asset, str(power_connections[connection]["left_right"])
                )
            )
        except ConnectionError:
            return JsonResponse(
                {
                    "failure_message": Status.CONNECTION.value
                    + PowerFailure.CONNECTION.value
                },
                status=HTTPStatus.REQUEST_TIMEOUT,
            )
        power_status = regex_power_status(
            html.text, power_connections[connection]["port_number"]
        )[0]
        if power_status == "ON":
            toggle_pdu_power(asset, connection, "off")
    log_power_action(
        request.user, PowerAction.OFF, asset,
    )
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + "Power turned off."},
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pdu_power_cycle(request):
    data = JSONParser().parse(request)
    if "id" not in data.keys():
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "No asset 'id' given",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        asset = Asset.objects.get(id=data["id"])
    except Asset.DoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value
                + "Asset"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing asset with id=" + str(data["id"]),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if not user_has_power_permission(request.user, asset=asset):
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.POWER.value,
                "errors": "User "
                + request.user.username
                + " does not have power permission and does not own"
                + " asset with id="
                + str(data["id"]),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    power_connections = serialize_power_connections(PowerPort, asset)
    for connection in power_connections:
        toggle_pdu_power(asset, connection, "off")
    time.sleep(2)
    for connection in power_connections:
        toggle_pdu_power(asset, connection, "on")
    log_power_action(request.user, PowerAction.CYCLE, asset)
    return JsonResponse(
        {
            "success_message": Status.SUCCESS.value
            + "Power cycled, all asset power ports reset."
        },
        status=HTTPStatus.OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pdu_power_availability(request):
    rack_id = request.query_params.get("id")
    if not rack_id:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Query parameter 'id' is required",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        rack = Rack.objects.get(id=rack_id)
    except Rack.DoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value
                + "Rack"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing rack with id=" + str(rack_id),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    if change_plan:
        assets, assets_cp = get_assets_for_cp(change_plan.id)
        assets_cp = assets_cp.filter(rack=rack.id)
        assets = assets.filter(rack=rack.id)
    else:
        assets = Asset.objects.filter(rack=rack.id)
    availableL = list(range(1, 25))
    availableR = list(range(1, 25))
    for asset in assets:
        asset_power = serialize_power_connections(PowerPort, asset)
        for port_num in asset_power.keys():
            if asset_power[port_num]["left_right"] == "L":
                try:

                    availableL.remove(asset_power[port_num]["port_number"])

                except ValueError:
                    failure_message = (
                        Status.ERROR.value
                        + "Port "
                        + asset_power[port_num]["port_number"]
                        + " does not exist on PDU"
                    )
                    return JsonResponse(
                        {"failure_message": failure_message},
                        status=HTTPStatus.BAD_REQUEST,
                    )
            else:
                try:
                    availableR.remove(asset_power[port_num]["port_number"])
                except ValueError:
                    failure_message = (
                        Status.ERROR.value
                        + "Port "
                        + asset_power[port_num]["port_number"]
                        + " does not exist on PDU"
                    )
                    return JsonResponse(
                        {"failure_message": failure_message},
                        status=HTTPStatus.BAD_REQUEST,
                    )
    if change_plan:
        for assetcp in assets_cp:
            asset_power = serialize_power_connections(PowerPortCP, assetcp)
            for port_num in asset_power.keys():
                if asset_power[port_num]["left_right"] == "L":
                    try:
                        availableL.remove(asset_power[port_num]["port_number"])
                    except ValueError:
                        failure_message = (
                            Status.ERROR.value
                            + "Port "
                            + asset_power[port_num]["port_number"]
                            + " does not exist on PDU"
                        )
                        return JsonResponse(
                            {"failure_message": failure_message},
                            status=HTTPStatus.BAD_REQUEST,
                        )
                else:
                    try:
                        availableR.remove(asset_power[port_num]["port_number"])
                    except ValueError:
                        failure_message = (
                            Status.ERROR.value
                            + "Port "
                            + asset_power[port_num]["port_number"]
                            + " does not exist on PDU"
                        )
                        return JsonResponse(
                            {"failure_message": failure_message},
                            status=HTTPStatus.BAD_REQUEST,
                        )

    for index in availableL:
        if index in availableR:
            suggest = index
            break

    return JsonResponse(
        {
            "left_available": availableL,
            "right_available": availableR,
            "left_suggest": suggest,
            "right_suggest": suggest,
        },
        status=HTTPStatus.OK,
    )


def regex_power_status(html, port):
    status_pattern = re.search("<td>" + str(port) + "<td><span.+(ON|OFF)", html)
    return status_pattern.groups(1)


def get_pdu_status_ext(asset, left_right):
    rack_str = str(asset.rack.row_letter)
    if (asset.rack.rack_num / 10) < 1:
        rack_str = rack_str + "0"
    rack_str = rack_str + str(asset.rack.rack_num)

    return rack_str + left_right


def toggle_pdu_power(asset, asset_port_number, goal_state):
    power_connections = serialize_power_connections(PowerPort, asset)
    pdu_port = power_connections[asset_port_number]["port_number"]
    pdu = "hpdu-rtp1-" + get_pdu_status_ext(
        asset, str(power_connections[asset_port_number]["left_right"])
    )
    try:
        requests.post(
            pdu_url + toggle_pdu, {"pdu": pdu, "port": pdu_port, "v": goal_state}
        )
    except ConnectionError:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + PowerFailure.CONNECTION.value
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    return


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chassis_power_status(request):
    data = JSONParser().parse(request)
    try:
        chassis_hostname, blade_slot = get_chassis_power_request_parameters(data)
    except ChassisPowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    result, exit_status = make_bcman_request(chassis_hostname, str(blade_slot), "")
    if exit_status != 0:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Request to bcman exited with non-zero status: "
                + str(exit_status),
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    if "is ON" in result:
        blade_slot_power_status = "ON"
    elif "is OFF" in result:
        blade_slot_power_status = "OFF"
    else:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Power status returned as: " + result,
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    return JsonResponse({str(blade_slot): blade_slot_power_status}, status=HTTPStatus.OK,)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chassis_power_on(request):
    data = JSONParser().parse(request)
    try:
        chassis_hostname, blade_slot = get_chassis_power_request_parameters(data)
    except ChassisPowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    result, exit_status = make_bcman_request(chassis_hostname, str(blade_slot), "on")
    if exit_status != 0:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Request to bcman exited with non-zero status: "
                + str(exit_status),
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + result}, status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chassis_power_off(request):
    data = JSONParser().parse(request)
    try:
        chassis_hostname, blade_slot = get_chassis_power_request_parameters(data)
    except ChassisPowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    result, exit_status = make_bcman_request(chassis_hostname, str(blade_slot), "off")
    if exit_status != 0:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Request to bcman exited with non-zero status: "
                + str(exit_status),
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + result}, status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chassis_power_cycle(request):
    data = JSONParser().parse(request)
    try:
        chassis_hostname, blade_slot = get_chassis_power_request_parameters(data)
    except ChassisPowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    result_off, exit_status_off = make_bcman_request(
        chassis_hostname, str(blade_slot), "off"
    )
    if exit_status_off != 0:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Request to bcman exited with non-zero status: "
                + str(exit_status_off),
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    time.sleep(2)
    result_on, exit_status_on = make_bcman_request(
        chassis_hostname, str(blade_slot), "on"
    )
    if exit_status_on != 0:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Request to bcman exited with non-zero status: "
                + str(exit_status_on),
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    result = (
        "chassis '" + chassis_hostname + "' blade " + str(blade_slot) + "' power cycled"
    )
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + result}, status=HTTPStatus.OK,
    )


def make_bcman_request(chassis, blade, power_command):
    user = os.environ["BCMAN_USERNAME"]
    host = "hyposoft-mgt.colab.duke.edu"
    options = os.environ["BCMAN_OPTIONS"]
    password = os.environ["BCMAN_PASSWORD"]
    cmd = "rackcity/utils/bcman.expect '{}' '{}' '{}' '{}' '{}' '{}' '{}' > temp.txt".format(
        user, host, options, password, chassis, blade, power_command,
    )
    exit_status = os.system(cmd)
    result = None
    if os.path.exists("temp.txt"):
        fp = open("temp.txt", "r")
        result = fp.read().splitlines()[0]
        fp.close()
        os.remove("temp.txt")
    return result, exit_status


def get_chassis_power_request_parameters(data):
    if ("chassis_id" not in data) or ("blade_slot" not in data):
        raise ChassisPowerManagementException(
            "Must specify 'chassis_id' and 'blade_slot' on chassis power request."
        )
    try:
        blade_slot = int(data["blade_slot"])
        chassis_id = int(data["chassis_id"])
    except ValueError:
        raise ChassisPowerManagementException(
            "Parameters 'chassis_id' and 'blade_slot' must be of type int."
        )
    try:
        chassis = Asset.objects.get(id=chassis_id)
    except ObjectDoesNotExist:
        raise ChassisPowerManagementException(
            "Chassis" + GenericFailure.DOES_NOT_EXIST.value
        )
    if (not chassis.model.is_blade_chassis) or (chassis.model.vendor != "BMI"):
        raise ChassisPowerManagementException(
            "Power is only network controllable for blade chassis of vendor 'BMI'."
        )
    if (blade_slot < 1) or (blade_slot > 14):
        raise ChassisPowerManagementException(
            "Blade slot " + str(blade_slot) + " does not exist on chassis."
        )
    return chassis.hostname, blade_slot