import module1, module0
import module2 as thing2
import module3.sub3
from module4 import thing4
from module5.sub2 import thing5 as thing6
from .module6 import thing7
from ..module7 import thing8
from . import module8, module9
from .. import module10

# Expect:
"""
..module7
..module9
.module6
.module8
module0
module1
module2
module3
module4
module5.sub2
"""

"""
module0
module1
module2
module3
module3.sub3
module4
module4.thing4
module5
module5.sub2
module5.sub2.thing5
.module6
.module6.thing7
..module7
..module7.thing8
.module8
.module9
..module10
"""