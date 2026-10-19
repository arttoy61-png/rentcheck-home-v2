"""Validate minimal450-partition map and consistent status before any commit/deploy."""
import json, sys
from pathlib import Path
from import_isolated_feed import validate, read, NAMES
path=Path(sys.argv[1]);data=validate(read(path),require_fresh=False)
status=read(path.with_name(NAMES[1]))
assert status.get('state') in ['ready','failed']
assert status.get('last_good_source_at')==data['meta']['source_checked_at']
print(json.dumps({'passed':True,'linked_rows':len(data['rows']),'unlinked_rows':data['meta']['coordinate_unlinked_rows']}))
