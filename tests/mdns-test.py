from zeroconf import ServiceBrowser, ServiceListener, Zeroconf
from zeroconf import ZeroconfServiceTypes

class MyListener(ServiceListener):

    def update_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        info = zc.get_service_info(type_, name)
        print(f">>> Service {name} updated")
        print("   ", info.server)

    def add_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        info = zc.get_service_info(type_, name)
        print(f"+++ Service {name} added")
        print("   ", info.server)

zeroconf = Zeroconf()
listener = MyListener()

browser2 = ServiceBrowser(zeroconf, "_circuitpython._tcp.local.", listener)
try:
    input("Press enter to exit...\n\n")
except KeyboardInterrupt:
    pass
finally:
    zeroconf.close()


# TYPE = '_http._tcp.local.'
# CP_LOCAL_DOMAIN = "circuitpython.local"

#     def remove_service(self, zc: Zeroconf, type_: str, name: str) -> None:
#         print(f"--- Service {name} removed")

# mdns.query({ questions:[{ name: CP_LOCAL_DOMAIN, type: 'A' }]})
# services = list(ZeroconfServiceTypes.find(zc=zeroconf))
# print(services)

# browser1 = ServiceBrowser(zeroconf, "_http._tcp.local.", listener)

