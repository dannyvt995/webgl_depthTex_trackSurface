"use client";
// SceneApp.js


import alfrid, {  GL } from 'alfrid';
import ViewSave from './ViewSave';
import ViewRender from './ViewRender';
import ViewSim from './ViewSim';
import ViewModel from './ViewModel';
import ViewModel2 from './ViewModel2';
import ViewObjModel from './ViewObjModel';


class SceneApp extends alfrid.Scene {
	constructor() {
		super();
		GL.enableAlphaBlending();

		this.camera.setPerspective(Math.PI/2, GL.aspectRatio, .01, 500);
		this.orbitalControl.radius.value = 3.5;
		this.orbitalControl.radius.limit(0.1, 100);
		this.orbitalControl.rx.value = this.orbitalControl.ry.value = 0.1;
		console.log(this.orbitalControl)

		this._shadowMatrix0 = mat4.create();
		this._shadowMatrix1 = mat4.create();
		this._biasMatrix = mat4.fromValues(
			0.5, 0.0, 0.0, 0.0,
			0.0, 0.5, 0.0, 0.0,
			0.0, 0.0, 0.5, 0.0,
			0.5, 0.5, 0.5, 1.0
		);

		const r = 10;
		this.pointSource0 = vec3.fromValues(0, 0, r);
		this.pointSource1 = vec3.fromValues(0, 0, -r);
		const s = 2;
		this._cameraLight0 = new alfrid.CameraOrtho();
		

		this._cameraLight0.ortho(-s, s, -s, s, 1, 50);
		this._cameraLight0.lookAt(this.pointSource0, [0, 0, 0]);

		this._cameraLight1 = new alfrid.CameraOrtho();
		this._cameraLight1.ortho(-s, s, -s, s, 1, 50);
		this._cameraLight1.lookAt(this.pointSource1, [0, 0, 0]);

		this.projInvert0 = mat4.create();
		mat4.invert(this.projInvert0, this._cameraLight0.projection);

		this.viewInvert0 = mat4.create();
		mat4.invert(this.viewInvert0, this._cameraLight0.matrix);

		this.projInvert1 = mat4.create();
		mat4.invert(this.projInvert1, this._cameraLight1.projection);

		this.viewInvert1 = mat4.create();
		mat4.invert(this.viewInvert1, this._cameraLight1.matrix);

		mat4.multiply(this._shadowMatrix0, this._cameraLight0.projection, this._cameraLight0.viewMatrix);
		mat4.multiply(this._shadowMatrix0, this._biasMatrix, this._shadowMatrix0);

		mat4.multiply(this._shadowMatrix1, this._cameraLight1.projection, this._cameraLight1.viewMatrix);
		mat4.multiply(this._shadowMatrix1, this._biasMatrix, this._shadowMatrix1);

		this.modelMatrix = mat4.create();

		this._hasDepthTexture = false;
	//	this.updateDepthTexture();
	}
	
	_initTextures() {
		console.log('init textures');

		//	FBOS
		const numParticles = params.numParticles;
		const o = {
			minFilter:GL.NEAREST,
			magFilter:GL.NEAREST,
			type:GL.FLOAT
		};

		const oRender = {
			minFilter:GL.LINEAR,
			magFilter:GL.LINEAR,
			type:GL.FLOAT
		};

		this._fboCurrent  	= new alfrid.FrameBuffer(numParticles, numParticles, o, 4);
		this._fboTarget  	= new alfrid.FrameBuffer(numParticles, numParticles, o, 4);

		this.fboModel0 = new alfrid.FrameBuffer(1024, 1024, {minFilter:GL.NEAREST, magFilter:GL.NEAREST, wrapS:GL.CLAMP_TO_EDGE, wrapT:GL.CLAMP_TO_EDGE});
		this.fboModel1 = new alfrid.FrameBuffer(1024, 1024, {minFilter:GL.NEAREST, magFilter:GL.NEAREST, wrapS:GL.CLAMP_TO_EDGE, wrapT:GL.CLAMP_TO_EDGE});

		this._fboRender = new alfrid.FrameBuffer(GL.width, GL.height, oRender);
		
	}


	_initViews() {
		console.log('init views');
		
		//	helpers
		this._bCopy = new alfrid.BatchCopy();
		// this._bAxis = new alfrid.BatchAxis();
		// this._bDots = new alfrid.BatchDotsPlane();
		// this._bBall = new alfrid.BatchBall();


		// model
		this._vModel = new ViewModel();
		this._vModel2 = new ViewModel2();
		this._vModelView = new ViewObjModel();
		
		//	views
		this._vRender = new ViewRender();
		this._vSim 	  = new ViewSim();

		this._vSave = new ViewSave();
		GL.setMatrices(this.cameraOrtho);


		this._fboCurrent.bind();
		GL.clear(0, 0, 0, 0);
		this._vSave.render();
		this._fboCurrent.unbind();

		this._fboTarget.bind();
		GL.clear(0, 0, 0, 0);
		this._vSave.render();
		this._fboTarget.unbind();

		GL.setMatrices(this.camera);


	
	}


	updateFbo() {
		this._fboTarget.bind();
		GL.clear(0, 0, 0, 1);
		
		this._vSim.render(
			this._fboCurrent.getTexture(1), 
			this._fboCurrent.getTexture(0), 
			this._fboCurrent.getTexture(2),
			this._fboCurrent.getTexture(3),
			this.fboModel0,
			this.fboModel1,
			this._shadowMatrix0, 
			this._shadowMatrix1, 
			this.projInvert0, 
			this.projInvert1, 
			this.viewInvert0, 
			this.viewInvert1
			);
		this._fboTarget.unbind();


		let tmp          = this._fboCurrent;
		this._fboCurrent = this._fboTarget;
		this._fboTarget  = tmp;

	}


	updateDepthTexture() {
		this.fboModel0.bind();
		GL.clear(0, 0, 0, 0);
		GL.setMatrices(this._cameraLight0);
		
		this._vModel.render()
		//this._vModel2.render()
		this.fboModel0.unbind();

		this.fboModel1.bind();
		GL.clear(0, 0, 0, 0);
		GL.setMatrices(this._cameraLight1);
		this._vModel.render();
		//this._vModel2.render()
		this.fboModel1.unbind();

		GL.setMatrices(this.camera);
	
		// this._hasDepthTexture = true;
	}


	render() {
		if(!this._hasDepthTexture) {
			this.updateDepthTexture();
		}
		this.updateFbo();

		GL.clear(0, 0, 0, 0);
	 	this._fboRender.bind();
	
		 this._vModelView.render()
		GL.clear(0, 0, 0, 1);
		

		this._fboRender.unbind();		


		//	FINAL OUTPUT
		GL.clear(0, 0, 0, 0);
		GL.disable(GL.DEPTH_TEST);	
		

		this._vRender.render(
			this._fboTarget.getTexture(0), //pos
			this._fboTarget.getTexture(1),	//vel
			this._fboTarget.getTexture(2),	//extra
			this._fboTarget.getTexture(3)	//life
		);
		
		GL.viewport(0, 0, GL.width, GL.height);
	
		GL.enableAdditiveBlending();
		this._bCopy.draw(this._fboRender.getTexture());
	//	this._bCopy.draw(this.fboModel0.getTexture());
	//	this._bCopy.draw(this._passBloom.getTexture());

		GL.enableAlphaBlending();
		GL.enable(GL.DEPTH_TEST);

	}


	resize() {
		const { innerWidth, innerHeight, devicePixelRatio } = window;
		GL.setSize(innerWidth, innerHeight);
		this.camera.setAspectRatio(GL.aspectRatio);
	}
}


export default SceneApp;