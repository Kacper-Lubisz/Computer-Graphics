#sed -r 's/C:\\\\Users\\\\kacpe\\\\Desktop\\\\Graphics Coursework\\\\.*?\\\\/textures\//g' -i livingroom.mtl
#sed -r 's/..\\\\..\\\\..\\\\modeling\\\\.*?\\\\/textures\//g'  -i livingroom.mtl
#sed 's/.tif/.png/g' -i livingroom.mtl
#
sed 's/livingroom.mtl/res\/models\/livingroom.mtl/' -i livingroom.obj
#sed -r 's/o Ceiling_Fan_Fan/o Ceiling_Fan_Fan\nmm 1 0 0 0 0 1 0 0 0 0 1 0 1.40699 2.7 -0.532871 1/' -i livingroom.obj
#sed -r 's/o Fan_Blade_Blade/o Fan_Blade_Blade\nmm 1 0 0 0 0 1 0 0 0 0 1 0 0 0 -0.175574 1/' -i livingroom.obj

