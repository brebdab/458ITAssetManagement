from rackcity.models import ITInstance, ITModel, Rack
from rackcity.api.objects import RackRangeSerializer

# CHECK EVERYWHERE is_location_full ITS USED TO CATCH EXCEPTION, MAKE SURE THE ERROR IS PASSED UP


def validate_instance_location(
    rack_id,
    instance_elevation,
    instance_height,
    instance_id=None,
):
    new_instance_location_range = [
        instance_elevation + i for i in range(instance_height)
    ]
    rack_height = Rack.objects.get(id=rack_id).height
    for location in new_instance_location_range:
        if location <= 0 or location > rack_height:
            raise LocationException("Cannot place instance outside of rack. ")
    instances_in_rack = ITInstance.objects.filter(rack=rack_id)
    for instance_in_rack in instances_in_rack:
        # Ignore if instance being modified conflicts with its old location
        if (instance_id is None or instance_in_rack.id != instance_id):
            for occupied_location in [
                instance_in_rack.elevation + i for i
                    in range(instance_in_rack.model.height)
            ]:
                if occupied_location in new_instance_location_range:
                    raise LocationException(
                        "Instance location conflicts with another instance: '" +
                        instance_in_rack.hostname +
                        "'. "
                    )


def validate_location_modification(data, existing_instance):
    instance_id = existing_instance.id
    rack_id = existing_instance.rack.id
    instance_elevation = existing_instance.elevation
    instance_height = existing_instance.model.height

    if 'elevation' in data:
        try:
            instance_elevation = int(data['elevation'])
        except ValueError:
            raise Exception("Field 'elevation' must be of type int.")

    if 'model' in data:
        try:
            instance_height = ITModel.objects.get(id=data['model']).height
        except Exception:
            raise Exception("No existing model with id=" +
                            str(data['model']) + ".")

    if 'rack' in data:
        try:
            rack_id = Rack.objects.get(id=data['rack']).id
        except Exception:
            raise Exception("No existing rack with id=" +
                            str(data['rack']) + ".")

    try:
        validate_instance_location(
            rack_id,
            instance_elevation,
            instance_height,
            instance_id=instance_id,
        )
    except LocationException as error:
        raise error


def records_are_identical(existing_data, new_data):
    existing_keys = existing_data.keys()
    new_keys = new_data.keys()
    for key in existing_keys:
        if (
            key not in new_keys
            and existing_data[key] is not None
            and key != 'id'
        ):
            return False
        if (
            key in new_keys
            and new_data[key] != existing_data[key]
        ):
            if not (
                isinstance(existing_data[key], int)
                and int(new_data[key]) == existing_data[key]
            ):
                return False
    return True


def no_infile_location_conflicts(instance_datas):
    location_occupied_by = {}
    for instance_data in instance_datas:
        rack = instance_data['rack']
        height = ITModel.objects.get(id=instance_data['model']).height
        elevation = int(instance_data['elevation'])
        instance_location_range = [  # THIS IS REPEATED! FACTOR OUT.
            elevation + i for i in range(height)
        ]
        if rack not in location_occupied_by:
            location_occupied_by[rack] = {}
        for location in instance_location_range:
            if location in location_occupied_by[rack]:
                raise LocationException(
                    "Instance '" +
                    instance_data['hostname'] +
                    "' conflicts with instance '" +
                    location_occupied_by[rack][location] +
                    "'. ")
            else:
                location_occupied_by[rack][location] = instance_data['hostname']
    return


class LocationException(Exception):
    def __init__(self, *args, **kwargs):
        Exception.__init__(self, *args, **kwargs)


def get_sort_arguments(data):
    sort_args = []
    if 'sort_by' in data:
        sort_by = data['sort_by']
        for sort in sort_by:
            if ('field' not in sort) or ('ascending' not in sort):
                raise Exception("Must specify 'field' and 'ascending' fields.")
            if not isinstance(sort['field'], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(sort['ascending'], bool):
                raise Exception("Field 'ascending' must be of type bool.")
            field_name = sort['field']
            order = "-" if not sort['ascending'] else ""
            sort_args.append(order + field_name)
    return sort_args


def get_filter_arguments(data):
    filter_args = []
    if 'filters' in data:
        filters = data['filters']
        for filter in filters:

            if (
                ('field' not in filter)
                or ('filter_type' not in filter)
                or ('filter' not in filter)
            ):
                raise Exception(
                    "Must specify 'field', 'filter_type', and 'filter' fields."
                )
            if not isinstance(filter['field'], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(filter['filter_type'], str):
                raise Exception("Field 'filter_type' must be of type string.")
            if not isinstance(filter['filter'], dict):
                raise Exception("Field 'filter' must be of type dict.")

            filter_field = filter['field']
            filter_type = filter['filter_type']
            filter_dict = filter['filter']

            if filter_type == 'text':
                if filter_dict['match_type'] == 'exact':
                    filter_args.append(
                        {
                            '{0}'.format(filter_field): filter_dict['value']
                        }
                    )
                elif filter_dict['match_type'] == 'contains':
                    filter_args.append(
                        {
                            '{0}__icontains'.format(filter_field):
                            filter_dict['value']
                        }
                    )

            elif filter_type == 'numeric':
                range_value = (
                    int(filter_dict['min']),
                    int(filter_dict['max'])
                )
                filter_args.append(
                    {
                        '{0}__range'.format(filter_field): range_value  # noqa inclusive on both min, max
                    }
                )

            elif filter_type == 'rack_range':
                range_serializer = RackRangeSerializer(data=filter_dict)
                if not range_serializer.is_valid():
                    raise Exception(
                        "Invalid rack_range filter: " +
                        str(range_serializer.errors)
                    )
                filter_args.append(
                    {
                        'rack__rack_num__range':
                        range_serializer.get_number_range()
                    }
                )
                filter_args.append(
                    {
                        'rack__row_letter__range':
                        range_serializer.get_row_range()  # noqa inclusive on both letter, number
                    }
                )

            else:
                raise Exception(
                    "String field 'filter_type' must be either 'text', " +
                    "'numeric', or 'rack_range'."
                )

    return filter_args
