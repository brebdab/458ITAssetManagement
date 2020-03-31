from datetime import datetime
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from rackcity.api.serializers import (
    AddChangePlanSerializer,
    GetChangePlanSerializer,
)
from http import HTTPStatus
from rackcity.models import (
    ChangePlan,
    AssetCP,
)
from rackcity.utils.change_planner_utils import (
    get_modifications_in_cp,
    asset_cp_has_conflicts,
    get_cp_already_executed_response,
)
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    parse_serializer_errors,
    parse_save_validation_error,
)
from rackcity.utils.execute_change_planner_utils import (
    update_network_ports,
    update_power_ports,
    decommission_asset_cp,
    get_updated_asset,
)
from rackcity.utils.log_utils import (
    Action,
    log_action,
    log_execute_change_plan,
)
from rackcity.utils.query_utils import (
    get_page_count_response,
    get_many_response,
)
from rackcity.utils.rackcity_utils import get_change_plan
from rest_framework.decorators import permission_classes, api_view
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_resolve_conflict(request, id):
    """
    Resolve a merge conflict
    """
    (change_plan, response) = get_change_plan(id)
    if response:
        return response
    response = get_cp_already_executed_response(change_plan)
    if response:
        return response
    data = JSONParser().parse(request)
    if 'asset_cp' not in data or "override_live" not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include both 'asset_cp' and `override_live` when resolving a merge conflict"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    asset_cp = data['asset_cp']
    override_live = data["override_live"]
    try:
        asset_cp = AssetCP.objects.get(id=asset_cp)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value +
                    "AssetCP" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing Asset CP with id="+str(asset_cp)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        if override_live:
            asset_cp.is_conflict = False
            asset_cp.save()
        else:
            asset_cp.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "Change Plan" +
                    GenericFailure.ON_DELETE.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    return JsonResponse(
        {
            "success_message":
                Status.SUCCESS.value +
                "Sucessfully resolved conflict "
        },
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_remove_asset(request, id):
    """
    Remove a single assetCP from a change plan
    """
    (change_plan, response) = get_change_plan(id)
    if response:
        return response
    response = get_cp_already_executed_response(change_plan)
    if response:
        return response
    data = JSONParser().parse(request)
    if 'asset_cp' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include 'asset_cp' when removing an asset from change plan"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    asset_cp = data['asset_cp']

    try:
        asset_cp_model = AssetCP.objects.get(id=asset_cp)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value +
                    "AssetCP" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing Asset CP with id="+str(asset_cp)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        asset_cp_model.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "Change Plan" +
                    GenericFailure.ON_DELETE.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )

    return JsonResponse(
        {
            "success_message":
                Status.SUCCESS.value +
                "Asset successfully removed from change plan"
        },
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_delete(request):
    """
    Delete a single existing change plan
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when deleting a Change Plan"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    try:
        existing_change_plan = ChangePlan.objects.get(id=id)

    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Change plan" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing Change Plan with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    response = get_cp_already_executed_response(existing_change_plan)
    if response:
        return response
    try:
        existing_change_plan.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "Change Plan" +
                    GenericFailure.ON_DELETE.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    return JsonResponse(
        {
            "success_message":
                Status.SUCCESS.value +
                "Change Plan " + str(existing_change_plan.name) + " deleted"
        },
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_modify(request):
    """
    Modify single existing change plan
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                Status.MODIFY_ERROR.value + GenericFailure.INTERNAL.value,
                    "errors": "Must include 'id' when modifying a change plan"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    try:
        existing_change_plan = ChangePlan.objects.get(id=id)

    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Change plan" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing change plan with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    response = get_cp_already_executed_response(existing_change_plan)
    if response:
        return response
    for field in data.keys():
        value = data[field]
        setattr(existing_change_plan, field, value)
    try:
        existing_change_plan.save()
        return JsonResponse(
            {
                "success_message":
                    Status.SUCCESS.value +
                    "Change Plan " +
                    str(existing_change_plan.name) +
                    " modified",
                "related_id": str(existing_change_plan.id)
            },
            status=HTTPStatus.OK,
        )
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    parse_save_validation_error(error, "Asset"),
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_add(request):
    """
    Add a new change plan
    """
    data = JSONParser().parse(request)
    if 'id' in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.CREATE_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Don't include 'id' when creating a change planner"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    data["owner"] = request.user.id
    serializer = AddChangePlanSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        return JsonResponse(
            {
                "failure_message":
                    Status.INVALID_INPUT.value +
                    parse_serializer_errors(serializer.errors),
                "errors": str(serializer.errors)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        change_plan = serializer.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.CREATE_ERROR.value +
                    parse_save_validation_error(error, "Change Plan"),
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    return JsonResponse(
        {
            "success_message":
                Status.SUCCESS.value +
                "Change Plan " +
                str(change_plan.name) +
                " created",
            "related_id": str(change_plan.id)
        },
        status=HTTPStatus.OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    return get_page_count_response(ChangePlan, request.query_params)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_many(request):
    """
    List many change plans. If page is not specified as a query parameter, all
    models are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of models will be returned.
    """
    user = request.user
    user_change_plans = ChangePlan.objects.filter(owner=user)
    return get_many_response(
        ChangePlan,
        GetChangePlanSerializer,
        "change-plans",
        request,
        premade_object_query=user_change_plans,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def change_plan_detail(request, id):
    """
    Retrieve a single change plan.
    """
    try:
        change_plan = ChangePlan.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value +
                    "Change Plan" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing change plan with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if request.user != change_plan.owner:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value +
                    "You do not have access to this change plan.",
                "errors":
                    "User " + request.user.username +
                    " does not own change plan with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    change_plan_serializer = GetChangePlanSerializer(change_plan)
    modifications = get_modifications_in_cp(change_plan)
    return JsonResponse(
        {
            "change_plan": change_plan_serializer.data,
            "modifications": modifications,
        },
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_execute(request, id):
    """
    Execute all changes associated with a change plan.
    """
    (change_plan, response) = get_change_plan(id)
    if response:
        return response
    response = get_cp_already_executed_response(change_plan)
    if response:
        return response
    if request.user != change_plan.owner:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value +
                    "You do not have access to execute this change plan.",
                "errors":
                    "User " + request.user.username +
                    " does not own change plan with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST,
        )

    assets_cp = AssetCP.objects.filter(change_plan=change_plan)
    for asset_cp in assets_cp:
        if asset_cp_has_conflicts(asset_cp):
            return JsonResponse(
                {
                    "failure_message":
                        Status.ERROR.value +
                        "All conflicts must be resolved before a change " +
                        "plan can be executed.",
                    "errors":
                        "Conflict found on AssetCP with id=" + str(asset_cp.id)
                },
                status=HTTPStatus.BAD_REQUEST,
            )

    change_plan.execution_time = datetime.now()
    change_plan.save()

    num_created = 0
    num_modified = 0
    num_decommissioned = 0
    updated_asset_mappings = {}
    for asset_cp in assets_cp:
        updated_asset, created = get_updated_asset(asset_cp)
        updated_asset_mappings[asset_cp] = updated_asset
        if created:
            num_created += 1
            log_action(
                request.user,
                updated_asset,
                Action.CREATE,
                change_plan=change_plan,
            )
        else:
            num_modified += 1
            log_action(
                request.user,
                updated_asset,
                Action.MODIFY,
                change_plan=change_plan,
            )
        update_network_ports(updated_asset, asset_cp, change_plan)
        update_power_ports(updated_asset, asset_cp, change_plan)

    for asset_cp in assets_cp:
        # Decommission only after all changes have been made to all CP assets
        updated_asset = updated_asset_mappings[asset_cp]
        if asset_cp.is_decommissioned:
            failure_response = decommission_asset_cp(
                updated_asset,
                asset_cp,
                change_plan,
            )
            if failure_response:
                return failure_response
            num_decommissioned += 1
            log_action(
                request.user,
                None,
                Action.DECOMMISSION,
                change_plan=change_plan,
            )

    log_execute_change_plan(
        request.user,
        change_plan.name,
        num_created,
        num_modified,
        num_decommissioned,
    )

    return JsonResponse(
        {"success_message":
            "Change Plan '" + change_plan.name + "' executed: " +
            str(num_created) + " assets created, " +
            str(num_modified) + " assets modified, " +
            str(num_decommissioned) + " assets decommissioned."
         },
        status=HTTPStatus.OK,
    )
