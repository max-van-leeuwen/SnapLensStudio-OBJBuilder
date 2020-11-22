// Max van Leeuwen
//
// Builds meshes from meshFile assets using Lens Studio's MeshBuilder.
// Use accompanying objToJS.py to generate meshFile assets from Wavefront .obj-files.
//
// maxvanleeuwen.com
// @maksvanleeuwen



//@ui {"widget":"label", "label":"by Max van Leeuwen"}
//@ui {"widget":"label", "label":"twitter: @maksvanleeuwen"}
//@ui {"widget":"label", "label":""}

//@input bool buildOnStart
//@input Component.Script meshFile
//@input Component.MeshVisual meshVisual
//@input int meshTopology {"widget":"combobox", "values":[{"label":"Lines", "value":0}, {"label":"LineStrip", "value":1}, {"label":"Points", "value":2}, {"label":"Triangles", "value":3}, {"label":"TriangleFan", "value":4}, {"label":"TriangleStrip", "value":5}]}
//@input bool normals
//@input bool uvs



// exposed functions and variables
script.api.drawMesh = drawMesh;						// (re)draws mesh with current settings
script.api.getVertexPosition = getVertexPosition;	// gets world position for given vertex int
script.api.getVertexNormal = getVertexNormal;		// gets normals for given vertex int
script.api.getVertexUV = getVertexUV;				// gets uvs for given vertex int
script.api.vertexCount = -1;						// amount of vertices in mesh

script.api.meshVisual;
script.api.meshFile;
script.api.meshTopology;							// 0-5 value, see meshTopology list in inspector for reference
script.api.meshNormals;
script.api.meshUVs;






const debugText = "[OBJBuilder] ";



function init(){
	// initial mesh settings
	script.api.meshVisual = script.meshVisual;
	script.api.meshFile = script.meshFile;
	script.api.meshTopology = script.meshTopology;
	script.api.meshNormals = script.normals;
	script.api.meshUVs = script.uvs;
	if(!!script.api.meshFile.api.vertices){
		script.api.vertexCount = script.api.meshFile.api.vertices.length/3;
	}

	// draw mesh on start
	if(script.buildOnStart)	drawMesh(script.api.meshFile);
}
init();



function getVertexPosition(vertexInt){
	var transf = script.api.meshVisual.getSceneObject().getTransform().getWorldTransform();
	var vertexItem = vertexInt*3;
	var pos = new vec3(	script.api.meshFile.api.vertices[vertexItem], 
						script.api.meshFile.api.vertices[vertexItem+1],
						script.api.meshFile.api.vertices[vertexItem+2]);
	return transf.multiplyPoint(pos);
}

function getVertexNormal(vertexInt){
	var vertexItem = vertexInt*3;
	return new vec3(script.api.meshFile.api.normals[vertexItem], 
					script.api.meshFile.api.normals[vertexItem+1],
					script.api.meshFile.api.normals[vertexItem+2]);
}

function getVertexUV(vertexInt){
	var uvLength = script.api.meshFile.api.uvLength;

	if(uvLength === 1){
		var vertexItem = vertexInt;
		return script.api.meshFile.api.uvs[vertexItem];

	}else if(uvLength === 2){
		var vertexItem = vertexInt*2;
		return new vec2(script.api.meshFile.api.uvs[vertexItem], 
						script.api.meshFile.api.uvs[vertexItem+1]);

	}else if(uvLength === 3){
		var vertexItem = vertexInt*3;
		return new vec3(script.api.meshFile.api.uvs[vertexItem], 
						script.api.meshFile.api.uvs[vertexItem+1],
						script.api.meshFile.api.uvs[vertexItem+2]);
		
	}else{
		print(debugText + "Unsupported UV array length (" + uvLength.toString() + ")!");
		return;
	}
}



function drawMesh(){
	// checks
	if(!script.api.meshFile){
		print(debugText + "No meshFile to draw!");
		return;
	}
	if(!script.api.meshVisual){
		print(debugText + "No renderMeshVisual component to draw to!");
		return;
	}

	// get vertex attributes, if they exist

	var normals = !!script.api.meshFile.api.normals && script.api.meshNormals;
	var uvs 	= !!script.api.meshFile.api.uvs 	&& script.api.meshUVs;
	var faces	= !!script.api.meshFile.api.faces;

	var objName = script.api.meshFile.getSceneObject().name;
	var uvLength = uvs ? script.api.meshFile.api.uvLength : -1;
	var builder = initBuilder(normals, uvs, uvLength);

	// vertices
	var verticesInterleaved = [];
	var verticesLength = script.api.meshFile.api.vertices.length;
	for(var i = 0; i < verticesLength; i++){
		verticesInterleaved.push(script.api.meshFile.api.vertices[i]);
		if(i % 3 == 2){
			if(normals){
				for(var j = 0; j < 3; j++){
					var index = i - (2-j); // i-2, i-1, i
					verticesInterleaved.push(script.api.meshFile.api.normals[index]);
				}
			}
			if(uvs){
				for(var j = 0; j < uvLength; j++){
					var index = ((i+1)/3-1)*2+j; // 0, 1 -- 2, 3 ...
					verticesInterleaved.push(script.api.meshFile.api.uvs[index]);
				}
			}
		}
	}

	// faces
	builder.appendVerticesInterleaved(verticesInterleaved);
	if(faces){
		builder.appendIndices(script.api.meshFile.api.faces);
	}

	// build
	if(builder.isValid()){
		script.api.vertexCount = verticesLength/3;
		script.meshVisual.mesh = builder.getMesh();
		builder.updateMesh();
		print(debugText + "---");
		print(debugText + "meshFile built!");
		print(debugText + "mesh:" + objName + ", topology:" + script.api.meshTopology.toString() + ", normals:" + normals.toString() + ", uvs:" + uvs.toString());
		print(debugText + "---");
	}else{
		print(debugText + "---");
		print(debugText + "meshFile data invalid: " + objName);
		print(debugText + "---");
	}
}



// initialises MeshBuilder
function initBuilder(normals, uvs, uvLength){

	// mesh attributes (position, opt. normals, opt. uvs)
	attributes = [{name: "position", components: 3}];
	if(normals) 	attributes = attributes.concat([{name: "normal", components: 3, normalized: false}]);
	if(uvs) 		attributes = attributes.concat([{name: "texture0", components: uvLength}]);

	var builder = new MeshBuilder(attributes);
	builder.indexType = MeshIndexType.UInt16;
	switch(script.api.meshTopology){
		case 0:
			builder.topology = MeshTopology.Lines;
			break;
		case 1:
			builder.topology = MeshTopology.LineStrip;
			break;
		case 2:
			builder.topology = MeshTopology.Points;
			break;
		case 3:
			builder.topology = MeshTopology.Triangles;
			break;
		case 4:
			builder.topology = MeshTopology.TriangleFan;
			break;
		case 5:
			builder.topology = MeshTopology.TriangleStrip;
			break;
	}
	return builder;
}