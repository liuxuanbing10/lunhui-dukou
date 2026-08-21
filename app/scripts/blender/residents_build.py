# Blender 无头建模：8 位居民 → app/assets/models/resident_r{n}.glb
# ------------------------------------------------------------------
# 用法：blender.exe --background --python residents_build.py
# 说明：每位居民用一组参数（衣色/身形/斗笠/配饰/弧驼/表情色）在纯脚本里低模化，
#       一次导出 8 个 GLB 进 Godot。脚本是唯一可复现源（不维护 .blend，符合 R4）。
import bpy
import bmesh
import math
import os

OUT_DIR = r"D:/Projects/lunhui-dukou/app/assets/models"

def make_mat(name, color, rough=0.9):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = rough
    return m

def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)

def frustum(name, r0, r1, height, y0=0.0, verts=20):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    bm = bmesh.new()
    ring0, ring1 = [], []
    for i in range(verts):
        a = 2 * math.pi * i / verts
        ring0.append(bm.verts.new((r0 * math.cos(a), r0 * math.sin(a), y0)))
        ring1.append(bm.verts.new((r1 * math.cos(a), r1 * math.sin(a), y0 + height)))
    bm.verts.ensure_lookup_table()
    for i in range(verts):
        j = (i + 1) % verts
        bm.faces.new((ring0[i], ring0[j], ring1[j], ring1[i]))
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    return obj

def cone(name, radius, depth, z, mat):
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=radius, radius2=0.001,
                                    depth=depth, location=(0.0, 0.0, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def sphere(name, radius, x, z, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=(x, 0.0, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def cyl(name, radius, depth, x, z, mat, rot=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=(x, 0.0, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler[2] = math.radians(rot)
    obj.data.materials.append(mat)
    return obj

# 每位居民：衣色/身形(r0 底,r1 顶,h)/斗笠/配饰/皮肤/驼背倾角
RESIDENTS = {
    # id: (coat_rgb, r0, r1, h, hat_rgb|None, skin_rgb, tilt, extras)
    "r1": ((0.180, 0.290, 0.247), 0.42, 0.26, 1.05, (0.122, 0.196, 0.165), (0.725, 0.541, 0.416), 0, "hat"),
    "r2": ((0.604, 0.420, 0.310), 0.30, 0.46, 1.00, None, (0.891, 0.698, 0.561), 0, "flower"),
    "r3": ((0.722, 0.592, 0.341), 0.46, 0.32, 1.00, None, (0.784, 0.608, 0.435), 0, "apron"),
    "r4": ((0.431, 0.294, 0.227), 0.30, 0.22, 0.95, None, (0.847, 0.706, 0.541), 10, ""),
    "r5": ((0.361, 0.420, 0.451), 0.38, 0.24, 1.00, None, (0.722, 0.604, 0.447), 14, ""),
    "r6": ((0.431, 0.353, 0.243), 0.50, 0.34, 1.12, (0.353, 0.278, 0.173), (0.541, 0.415, 0.259), 0, "net"),
    "r7": ((0.290, 0.353, 0.420), 0.38, 0.28, 1.05, (0.200, 0.200, 0.216), (0.690, 0.541, 0.369), 0, "lantern"),
    "r8": ((0.478, 0.545, 0.431), 0.24, 0.30, 0.62, None, (0.788, 0.659, 0.478), 0, "bundle"),
}

def build(rid):
    clear_scene()
    coat, r0, r1, h, hat, skin, tilt, extra = RESIDENTS[rid]
    coat_mat = make_mat("Coat", coat)
    skin_mat = make_mat("Skin", skin)

    c = frustum("Coat", r0=r0, r1=r1, height=h, y0=0.0)
    c.data.materials.append(coat_mat)
    c.rotation_euler[1] = math.radians(tilt)  # 驼背前倾

    head_y = 0.85 * h + 0.16
    sphere("Head", radius=0.16, x=0, z=head_y, mat=skin_mat)

    if hat:
        cone("Hat", radius=0.42, depth=0.14, z=head_y + 0.12, mat=make_mat("Hat", hat))

    # 手臂（短圆柱，藏进衣袖线）
    for side, dx in (("L", -(r0 * 0.7)), ("R", r0 * 0.7)):
        cyl(f"Arm{side}", 0.06, 0.30, dx * 0.9, 0.62 * h, coat_mat, rot=-20 if dx > 0 else 20)

    # 配饰：象征性占位（用简单球/柱表达角色标签）
    if extra == "flower":
        sphere("Flower", 0.09, r0 * 0.9, 1.05, make_mat("Flower", (0.910, 0.416, 0.478)))
    elif extra == "apron":
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(r0 * 0.2, 0, 0.55 * h))
        a = bpy.context.active_object
        a.name = "Apron"
        a.scale = (0.28, 0.03, 0.45)
        a.data.materials.append(make_mat("Apron", (0.941, 0.886, 0.824)))
    elif extra == "net":
        cyl("Net", 0.16, 0.20, r0 * 1.1, 0.6 * h, make_mat("Net", (0.180, 0.290, 0.247)), rot=25)
    elif extra == "lantern":
        cyl("Lantern", 0.07, 0.16, r0 * 1.1, 0.7 * h, make_mat("Lantern", (1.0, 0.694, 0.361)), rot=15)
    elif extra == "bundle":
        sphere("Bundle", 0.11, r0 * 0.8, 0.62 * h, make_mat("Bundle", (0.847, 0.635, 0.290)))

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"resident_{rid}.glb").replace("/", "\\")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB")
    print("BLENDER_OK", "resident_" + rid + ".glb", os.path.getsize(out))

for rid in RESIDENTS:
    build(rid)