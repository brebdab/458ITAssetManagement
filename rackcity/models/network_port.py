from django.db import models
from .asset import Asset

def format_mac_address(mac_address):
    # all lower case
    mac_address = mac_address.lower()
    # if contains - as a delimiter, convert to :
    mac_address = mac_address.replace("-", ":")
    # if contains no delimiters:
    mac_address = '-'.join(a+b for a, b in zip(mac_address[::2], mac_address[1::2]))
    return mac_address
    
class NetworkPort(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, verbose_name="asset",)
    port_name = models.CharField(
        max_length=150
        # electing not to validate this as it is not user entered
    )
    mac_address = models.CharField(
        max_length=17,
        null=True,
        blank=True,
        # force this to lowercase and make delimeters :
    )
    connected_port = models.OneToOneField(
        "self", on_delete=models.CASCADE, null=True, blank=True,
    )

    def create_network_connection(self, destination_port):
        if destination_port.connected_port and destination_port.connected_port != self:
            from rackcity.views.rackcity_utils import NetworkConnectionException

            raise NetworkConnectionException(
                "Destination port '"
                + destination_port.asset.hostname
                + ":"
                + destination_port.port_name
                + "' is already connected to port '"
                + destination_port.connected_port.asset.hostname
                + ":"
                + destination_port.connected_port.port_name
                + "'. "
            )
        if self.connected_port:
            self.delete_network_connection()
        if self.mac_address is not None:
            self.mac_address = format_mac_address(self.mac_address)
        self.connected_port = destination_port
        destination_port.connected_port = self
        self.save()
        destination_port.save()

    def delete_network_connection(self):
        destination_port = self.connected_port
        if not destination_port:
            return
        else:
            self.connected_port = None
            destination_port.connected_port = None
            self.save()
            destination_port.save()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["asset", "port_name"],
                name="unique network port names on assets",
            ),
        ]
