import requests
from requests.auth import HTTPBasicAuth

IP = "192.168.1.79"
PORT = 80

IP = "funhouse"
PORT = 8080

auth = HTTPBasicAuth("", "passw0rd")

############################################################

with requests.options(
		f"http://{IP}:{PORT}/fs/",
		headers={
			"Accept": "application/json",
		},
		auth=auth
		) as r:
	print("-"*70)
	print("  ", r.status_code)
	print(r.content)
	print(r.headers)

"""
print("Reading /fs/")

with requests.get(
		f"http://{IP}:{PORT}/fs/",
		headers={"Accept": "application/json"},
		auth=auth
		) as r:
	print("-"*70)
	print("  ", r.status_code)
	print(r.json())

with requests.options(
		f"http://{IP}:{PORT}/fs/",
		headers={"Accept": "application/json"},
		auth=auth
		) as r:
	print("-"*70)
	print("  ", r.status_code)
	print(r.content)
	print(r.headers)

with requests.get(
		f"http://{IP}:{PORT}/cp/version.json",
		headers={"Accept": "application/json"},
		auth=auth
		) as r:
	print("-"*70)
	print("  ", r.status_code)
	print(r.content)
	print(r.headers)

with requests.get(
		f"http://{IP}:{PORT}/fs/lib/",
		headers={"Accept": "application/json"},
		auth=auth
		) as r:
	print("-"*70)
	print("  ", r.status_code)
	print(r.json())
"""

############################################################

# print("Creating a test dir")
# 
# with requests.put(
# 		f"http://{IP}:{PORT}/fs/test/",
# 		auth=auth
# 		) as r:
# 	print("  ", r.status_code)

# print("delete the directory for tests")
# 
# with requests.delete(
# 		f"http://{IP}:{PORT}/fs/test/",
# 		auth=auth
# 		) as r:
# 	print("  ", r.status_code)

############################################################

# print("Uploading a test file")
# 
# with requests.put(
# 		f"http://{IP}:{PORT}/fs/test.py",
# 		'print("Hello ESP32 V2!")',
# 		auth=auth
# 		) as r:
# 	print("  ", r.status_code)

############################################################

# try:
# 	print("Reading /fs/ a second time")
# 
# 	with requests.get(
# 			f"http://{IP}:{PORT}/fs/",
# 			headers={"Accept": "application/json"},
# 			auth=auth
# 			) as r:
# 		print("  ", r.status_code, "a file:", r.json()[0]["name"])
# except requests.exceptions.ConnectionError as ex:
# 	print("   FAILED reading")

