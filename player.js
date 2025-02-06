import * as THREE from 'three';
import { FBXLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/FBXLoader.js';

class Player {
    constructor(playerGroup) {
        this.playerGroup = playerGroup;
        this.mixer = null;
        this.actions = {
            stop: null,
            walking: null,
            jumping: null,
            kneeling: null,
            left: null,
            right: null,
            backwards: null
        };
        this.currentAction = null;
        this.clock = new THREE.Clock();
        this.isJumping = false;
        this.moveInterval = null;

        // إنشاء محور الشخصية وتدويرها 90 درجة
        this.characterPivot = new THREE.Object3D();
        this.characterPivot.rotation.y = -Math.PI / 2;
        this.playerGroup.add(this.characterPivot);

        // إعداد كاميرا الشخص الثالث
        this.thirdPersonCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.thirdPersonCamera.position.set(0, 20, -35);
        this.characterPivot.add(this.thirdPersonCamera);

        // متغيرات التحكم بالدوران
        this.touchStartX = 0;
        this.rotationSpeed = 0.005;
        this.isDragging = false;

        // حالة التحميل
        this.loadingStatus = document.getElementById('loadingStatus');
        this.animationsLoaded = 0;
        this.totalAnimations = 7;

        this.loadCharacter();
    }

    loadCharacter() {
        const loader = new FBXLoader();
        const animations = [
            { name: 'stop', file: 'Stop.fbx', loop: THREE.LoopOnce },
            { name: 'walking', file: 'Walking.fbx', loop: THREE.LoopRepeat },
            { name: 'jumping', file: 'Jumping.fbx', loop: THREE.LoopOnce },
            { name: 'kneeling', file: 'Kneeling.fbx', loop: THREE.LoopRepeat },
            { name: 'left', file: 'Left.fbx', loop: THREE.LoopRepeat },
            { name: 'right', file: 'Right.fbx', loop: THREE.LoopRepeat },
            { name: 'backwards', file: 'Backwards.fbx', loop: THREE.LoopRepeat }
        ];

        loader.load('Stop.fbx', (object) => {
            object.scale.set(0.1, 0.1, 0.1);
            this.characterPivot.add(object);
            this.mixer = new THREE.AnimationMixer(object);

            animations.forEach(animation => {
                loader.load(animation.file, (animObject) => {
                    const action = this.mixer.clipAction(animObject.animations[0]);
                    action.clampWhenFinished = true;
                    action.loop = animation.loop;
                    this.actions[animation.name] = action;

                    this.animationsLoaded++;
                    this.updateLoadingStatus();

                    if (animation.name === 'stop') {
                        this.currentAction = action;
                        action.play();
                    }

                    if (this.animationsLoaded === this.totalAnimations) {
                        this.setupEventListeners();
                    }
                });
            });
        });
    }

    updateLoadingStatus() {
        this.loadingStatus.innerText = `Loading... (${this.animationsLoaded}/${this.totalAnimations})`;
        if (this.animationsLoaded === this.totalAnimations) {
            this.loadingStatus.innerText = 'All animations loaded!';
        }
    }

    setupEventListeners() {
        // أحداث الأزرار
        const buttons = {
            'walkingBtn': 'walking',
            'leftBtn': 'left',
            'rightBtn': 'right',
            'backwardsBtn': 'backwards',
            'jumpingBtn': 'jumping',
            'kneelingBtn': 'kneeling'
        };

        Object.entries(buttons).forEach(([btnId, actionName]) => {
            const button = document.getElementById(btnId);
            if (button) {
                button.addEventListener('mousedown', () => this.playAnimation(actionName));
                button.addEventListener('mouseup', () => this.returnToStop());
                button.addEventListener('mouseleave', () => this.returnToStop());

                button.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.playAnimation(actionName);
                });
                button.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.returnToStop();
                });
            }
        });

        // أحداث سحب الشاشة للدوران
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        document.addEventListener('touchend', () => this.handleTouchEnd());
    }

    handleTouchStart(e) {
        this.isDragging = true;
        this.touchStartX = e.touches[0].clientX;
    }

    handleTouchMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const touchEndX = e.touches[0].clientX;
        const deltaX = touchEndX - this.touchStartX;
        
        // تطبيق الدوران حول المحور Y
        this.characterPivot.rotation.y += deltaX * this.rotationSpeed;
        this.touchStartX = touchEndX;
    }

    handleTouchEnd() {
        this.isDragging = false;
    }

    playAnimation(actionName) {
        if (this.isJumping) return;

        const newAction = this.actions[actionName];
        if (newAction && this.currentAction !== newAction) {
            if (this.currentAction) {
                this.currentAction.fadeOut(0.2);
            }

            newAction.reset();
            newAction.fadeIn(0.2);
            newAction.play();
            this.currentAction = newAction;

            if (actionName === 'jumping') {
                this.handleJump();
            } else {
                this.handleMovement(actionName);
            }
        }
    }

    returnToStop() {
        if (this.isJumping) return;

        if (this.currentAction && this.currentAction !== this.actions.stop) {
            this.currentAction.fadeOut(0.2);
            this.actions.stop.reset();
            this.actions.stop.fadeIn(0.2);
            this.actions.stop.play();
            this.currentAction = this.actions.stop;

            if (this.moveInterval) {
                clearInterval(this.moveInterval);
                this.moveInterval = null;
            }
        }
    }

    handleJump() {
        this.isJumping = true;
        let jumpHeight = 0;
        let jumpUp = true;

        if (this.moveInterval) clearInterval(this.moveInterval);

        this.moveInterval = setInterval(() => {
            if (jumpUp) {
                jumpHeight += 0.1;
                if (jumpHeight >= 1) jumpUp = false;
            } else {
                jumpHeight -= 0.1;
                if (jumpHeight <= 0) {
                    clearInterval(this.moveInterval);
                    this.moveInterval = null;
                    this.isJumping = false;
                    this.returnToStop();
                }
            }
            this.characterPivot.position.y = jumpHeight;
        }, 50);
    }

    handleMovement(actionName) {
        if (this.moveInterval) clearInterval(this.moveInterval);

        const moveSpeed = 0.4;
        this.moveInterval = setInterval(() => {
            const direction = new THREE.Vector3();

            switch(actionName) {
                case 'walking':
                    direction.set(0, 0, 1); // الاتجاه الأمامي المحلي
                    break;
                case 'backwards':
                    direction.set(0, 0, -1); // الاتجاه الخلفي المحلي
                    break;
                case 'left':
                    direction.set(1, 0, 0); // الاتجاه الأيسر المحلي
                    break;
                case 'right':
                    direction.set(-1, 0, 0); // الاتجاه الأيمن المحلي
                    break;
            }

            // تحويل المتجه المحلي إلى متجه عالمي
            direction.applyQuaternion(this.characterPivot.quaternion);
            direction.multiplyScalar(moveSpeed);

            // تطبيق الحركة على الشخصية
            this.characterPivot.position.add(direction);
        }, 50);
    }

    update() {
        const delta = this.clock.getDelta();
        if (this.mixer) this.mixer.update(delta);

        // تحويل النقطة (0, 0, 20) من الإحداثيات المحلية إلى الإحداثيات العالمية
        const targetPoint = new THREE.Vector3(0, 0, 20);
        this.characterPivot.localToWorld(targetPoint);

        // توجيه الكاميرا إلى النقطة المحولة
        this.thirdPersonCamera.lookAt(targetPoint);
    }

    onWindowResize() {
        this.thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
        this.thirdPersonCamera.updateProjectionMatrix();
    }
}

export default Player;