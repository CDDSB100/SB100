import torch
import platform
import multiprocessing

print("=== SISTEMA ===")
print("SO:", platform.system())
print("Versão:", platform.version())
print("Arquitetura:", platform.machine())

print("\n=== PYTHON ===")
print("Versão:", platform.python_version())

print("\n=== CPU ===")
print("Núcleos (lógicos):", multiprocessing.cpu_count())
print("Threads usadas pelo Torch:", torch.get_num_threads())

print("\n=== TORCH / CUDA ===")

cuda_available = torch.cuda.is_available()
print("CUDA disponível:", cuda_available)

if cuda_available:
    device_index = torch.cuda.current_device()
    print("Dispositivo atual:", device_index)
    print("Nome da GPU:", torch.cuda.get_device_name(device_index))
else:
    print("Rodando apenas em CPU (sem GPU disponível)")
