from django.db.models import Q
from django.http import JsonResponse
from http import HTTPStatus
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    RecursiveAssetCPSerializer,
)
from rackcity.models import Asset, AssetCP
from django.db.models.signals import post_save
from django.dispatch import receiver
from rackcity.utils.query_utils import get_filtered_query
from rackcity.models.asset import get_assets_for_cp
from rackcity.views.rackcity_utils import validate_asset_location, LocationException

@receiver(post_save, sender=Asset)
def create_asset_cp(sender, **kwargs):
    #fields: sender, instance, created, raw, using, update_fields
    ## asset is a related asset of assetCP
    instance = kwargs.get("instance")
    related_assets_cp = AssetCP.objects.filter(related_asset=instance.id)
    for related_asset in related_assets_cp:
        related_asset.is_conflict = True
        related_asset.save()
    # hostname conflicts with hostnames on assetcps
    instance.hostname_conflict.clear()
    AssetCP.objects.filter(
        Q(hostname=instance.hostname) & ~Q(related_asset_id=instance.id)
        ).update(asset_conflict_hostname=instance)

    # asset rack location conflicts with an assetCP

    instance.location_conflict.clear()
    for assetcp in AssetCP.objects.filter(rack=instance.rack_id):
        try: 
            validate_asset_location(
                instance.rack_id,
                assetcp.rack_position,
                assetcp.model.height,
                asset_id=assetcp.id
            )
        except LocationException:
            assetcp.asset_conflict_location = instance
            AssetCP.objects.filter(id=assetcp.id).update(asset_conflict_location=instance)
           

    # asset number conflict
    instance.asset_number_conflict.clear()
    AssetCP.objects.filter(
        Q(asset_number=instance.asset_number) & ~Q(related_asset_id=instance.id)
        ).update(asset_conflict_asset_number=instance)



def get_many_assets_response_for_cp(request, change_plan):
    assets, assetsCP = get_assets_for_cp(change_plan=change_plan)
    filtered_assets, filter_failure_response = get_filtered_query(
        assets,
        request.data,
    )
    if filter_failure_response:
        return filter_failure_response
    filtered_assetsCP, filter_failure_response = get_filtered_query(
        assetsCP,
        request.data,
    )
    if filter_failure_response:
        return filter_failure_response
    asset_serializer = RecursiveAssetSerializer(
        filtered_assets,
        many=True,
    )
    assetCP_serializer = RecursiveAssetCPSerializer(
        filtered_assetsCP,
        many=True,
    )
    all_assets = asset_serializer.data + assetCP_serializer.data
    return JsonResponse(
        {"assets": all_assets},
        status=HTTPStatus.OK,
    )
