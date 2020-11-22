# Max van Leeuwen
#
# Converts all Wavefront .obj-files in its directory to JS-files, to be drawn by Lens Studio's MeshBuilder.
# Use accompanying OBJBuilderController.js.
#
# maxvanleeuwen.com
# @maksvanleeuwen





# params
writeNormals	=	True
writeUVs		=	True
writeFaces		=	True
uvDimensions	=	2






# -----

# reusables
n = "\n"
c = ", "
t = "\t"
sp = " "
startTexts = ["// Max van Leeuwen", n + "//" + n + "// Generated JS file from 3D model, for use with Lens Studio's MeshBuilder.", n + "// Use accompanying OBJBuilderController.js.", n + "//" + n + "// maxvanleeuwen.com", n + "// @maksvanleeuwen", n + n + n]

# imports
import os
from os import listdir
from os.path import isfile, join



def getObjFiles():
	thisDir = os.path.dirname(os.path.realpath(__file__))
	items = listdir(thisDir)
	objPaths = []
	for item in items:
		if(isfile(join(thisDir, item)) and item.endswith('.obj')):
			objPaths.append(join(thisDir, item))
	return objPaths



def arrToStr(arr, div):
	arrStr = ''
	i = 0
	limit = len(arr)
	for item in arr:
		# string	  extra tab for long numbers, not on new line	  add a space for 1-digit nrs 	   value, newline removed 	  comma on end of array
		arrStr += t + (t if len(item) > 3 and i % div != 0 else "") + (sp if len(item) == 1 else "") + str(item).replace(n, "") + (c if i < limit-1 else "")
		if(i % div == div-1 and not i == limit-1):
			arrStr += n
		i += 1
	return arrStr



def objToJS(objPath):
	obj = open(objPath, "r")

	vertices = []
	normals = []
	uvs = []
	faces = []

	for line in obj.readlines():
		data = line.split(' ')

		if(line.startswith('v ')): # vertices
			vertices.extend([
				data[1],
				data[2],
				data[3]
			])

		elif(line.startswith('vn') and writeNormals): # normals
			normals.extend([
				data[1],
				data[2],
				data[3]
			])

		elif(line.startswith('vt') and writeUVs): # uvs
			if(uvDimensions > 0):
				uvs.append(data[1])
			if(uvDimensions > 1):
				uvs.append(data[2])
			if(uvDimensions > 2):
				uvs.append(data[3].replace(n, ""))

		elif(line.startswith('f') and writeFaces): # faces
			faces.extend([
				str(int(data[1].split('/')[0]) - 1), # faces start counting at 1 in obj files
				str(int(data[2].split('/')[0]) - 1),
				str(int(data[3].split('/')[0]) - 1)
			])

	vertexCount = int(len(vertices)/3)
	normalCount = int(len(normals)/3)
	uvCount		= int(len(uvs)/uvDimensions)
	faceCount	= int(len(faces)/3)

	if((vertexCount != normalCount and writeNormals) or (vertexCount != uvCount and writeUVs)):
		print("")
		print(objPath)
		print("ERROR: file not suitable for conversion!")
		print("make sure there are as many vertices (triangles) as there are normals and uvs (if enabled)")
		print("vertices: " 	+ str(vertexCount))
		if writeNormals:	print("normals: " 	+ str(normalCount))
		if writeUVs:		print("uvs: " 		+ str(uvCount))
		print("")
		exit()

	vertexStr	=	arrToStr(vertices, 3)
	normalsStr	=	arrToStr(normals, 3)
	uvStr		=	arrToStr(uvs, uvDimensions)
	facesStr	=	arrToStr(faces, 3)

	lines = startTexts.copy()
	lines.extend(n + "// vertices" + (c + "normals" if writeNormals else "") + (c + "uvs" if writeUVs else "") + ": " + str(vertexCount))

	if writeFaces: lines.extend(n + "// faces: " + str(faceCount))
	lines.extend(n+n)
	lines.extend("script.api.uvLength = " + str(uvDimensions) + n+n)
	lines.extend("script.api.vertices = [" + n + vertexStr + n + "];" + n+n)
	if writeNormals: 	lines.extend("script.api.normals = [" 	+ n + normalsStr 	+ n + "];" + n+n)
	if writeUVs: 		lines.extend("script.api.uvs = [" 		+ n + uvStr 		+ n + "];" + n+n)
	if writeFaces: 		lines.extend("script.api.faces = [" 	+ n + facesStr 		+ n + "];" + n+n)
	
	return lines



def writeJS(objPath):
	lines = objToJS(objPath)
	newPath = objPath[:-4] + '.js'
	if(os.path.exists(newPath)):
		os.remove(newPath)
	js = open(newPath, "w")
	js.writelines(lines)
	js.close()

	print("")
	print(objPath + " -> " + os.path.basename(newPath))
	print("file converted!")
	print("")



def start():
	print("")
	print("--- conversion started")
	for objPath in getObjFiles():
		writeJS(objPath)
		
start()