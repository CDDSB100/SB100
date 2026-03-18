__version__ = '0.24.1+cu128'
git_version = 'd801a34632023859a0a274803d6abaf0a45d77a5'
from torchvision.extension import _check_cuda_version
if _check_cuda_version() > 0:
    cuda = _check_cuda_version()
