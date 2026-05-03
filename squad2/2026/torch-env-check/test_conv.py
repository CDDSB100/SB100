import torch
import torch.nn as nn

print("Torch version:", torch.__version__)
print("MKLDNN enabled:", torch.backends.mkldnn.enabled)

m = nn.Conv2d(3, 16, 3)
x = torch.randn(1, 3, 224, 224)

y = m(x)
print("Conv2d funcionou.")
print("Output shape:", y.shape)
