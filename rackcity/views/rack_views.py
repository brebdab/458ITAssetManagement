# from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import Rack, ITInstance
from rackcity.api.serializers import RackSerializer, ITInstanceSerializer
from rackcity.api.objects import RackRangeSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from http import HTTPStatus


def rack_list(request):  # DEPRECATED !
    """
    List all racks.
    """
    if request.method == 'GET':
        racks = Rack.objects.all()
        serializer = RackSerializer(racks, many=True)
        return JsonResponse(serializer.data, safe=False)


def rack_detail(request, pk):  # DEPRECATED !
    """
    Retrieve a single rack.
    """
    try:
        rack = Rack.objects.get(pk=pk)
    except Rack.DoesNotExist:
        return HttpResponse(status=404)

    if request.method == 'GET':
        serializer = RackSerializer(rack)
        return JsonResponse(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rack_get(request):
    """
    List all racks within specified range.
    """
    range_serializer = RackRangeSerializer(data=request.data)

    if not range_serializer.is_valid():
        return JsonResponse(
            {"failure_message": "Invalid keys or values in request."},
            status=HTTPStatus.BAD_REQUEST,
        )

    racks = Rack.objects.filter(
        rack_num__range=range_serializer.get_number_range(),  # inclusive range
        row_letter__range=range_serializer.get_row_range(),
    )
    racks_with_instances = []
    for rack in racks:
        rack_serializer = RackSerializer(rack)
        instances = ITInstance.objects.filter(rack=rack.id)
        instances_serializer = ITInstanceSerializer(
            instances,
            many=True
        )
        rack_detail = {
            "rack": rack_serializer.data,
            "instances": instances_serializer.data,
        }
        racks_with_instances.append(rack_detail)

    return JsonResponse(
        {"racks": racks_with_instances},
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def rack_create(request):
    """
    Create racks within specified range.
    """
    range_serializer = RackRangeSerializer(data=request.data)
    if not range_serializer.is_valid():
        return JsonResponse(
            {"failure_message": "Invalid keys or values in request."},
            status=HTTPStatus.BAD_REQUEST,
        )
    racks = Rack.objects.filter(
        rack_num__range=range_serializer.get_number_range(),  # inclusive range
        row_letter__range=range_serializer.get_row_range(),
    )
    if racks.count() > 0:
        failure_message = "Racks cannot be created because racks within " + \
            "the range already exist."
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        rack_row_list = range_serializer.get_row_list()
        rack_num_list = range_serializer.get_number_list()
        for row in rack_row_list:
            for num in rack_num_list:
                rack = Rack(row_letter=row, rack_num=num)
                rack.save()
        return HttpResponse(status=HTTPStatus.OK)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def rack_delete(request):
    """
    Delete racks within specified range.
    """
    range_serializer = RackRangeSerializer(data=request.data)
    if not range_serializer.is_valid():
        return JsonResponse(
            {"failure_message": "Invalid keys or values in request."},
            status=HTTPStatus.BAD_REQUEST,
        )
    racks = Rack.objects.filter(
        rack_num__range=range_serializer.get_number_range(),  # inclusive range
        row_letter__range=range_serializer.get_row_range(),
    )
    if racks.count() == 0:
        failure_message = "No racks were deleted because no racks within" + \
            " the specified range exist."
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    elif racks.count() < range_serializer.get_num_racks_in_range():
        failure_message = "No racks were deleted because some racks within" + \
            " the specified range do not exist."
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    unempty_racks = []
    for rack in racks:
        if ITInstance.objects.filter(rack=rack.id).count() > 0:
            unempty_racks.append(rack.row_letter + str(rack.rack_num))
    if len(unempty_racks) > 0:
        failure_message = "No racks were deleted because the following " + \
            "racks contain instances: " + ", ".join(unempty_racks)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        try:
            racks.delete()
        except Exception as error:
            failure_message = str(error)
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST,
            )
        return HttpResponse(status=HTTPStatus.OK)
