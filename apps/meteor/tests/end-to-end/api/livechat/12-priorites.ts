/* eslint-env mocha */

import type { ILivechatPriority, IOmnichannelServiceLevelAgreements } from '@rocket.chat/core-typings';
import { expect } from 'chai';

import { getCredentials, api, request, credentials } from '../../../data/api-data';
import { savePriority, saveSLA } from '../../../data/livechat/priorities';
import { createAgent, createVisitor, createLivechatRoom, takeInquiry } from '../../../data/livechat/rooms';
import { updatePermission, updateSetting } from '../../../data/permissions.helper';
import { IS_EE } from '../../../e2e/config/constants';

(IS_EE ? describe : describe.skip)('[EE] LIVECHAT - Priorities', function () {
	this.retries(0);

	before((done) => getCredentials(done));

	before((done) => {
		updateSetting('Livechat_enabled', true)
			.then(() => updateSetting('Livechat_Routing_Method', 'Manual_Selection'))
			.then(done);
	});

	this.afterAll(async () => {
		await updatePermission('manage-livechat-priorities', ['admin', 'livechat-manager']);
		await updatePermission('view-l-room', ['admin', 'livechat-manager', 'livechat-agent']);
	});

	describe('livechat/sla', () => {
		it('should return an "unauthorized error" when the user does not have the necessary permission', async () => {
			await updatePermission('manage-livechat-priorities', []);
			await updatePermission('view-l-room', []);
			const response = await request.get(api('livechat/sla')).set(credentials).expect('Content-Type', 'application/json').expect(403);
			expect(response.body).to.have.property('success', false);
		});
		it('should return an array of slas', async () => {
			await updatePermission('manage-livechat-priorities', ['admin']);
			await updatePermission('view-l-room', ['livechat-agent']);
			const sla = await saveSLA();
			const response = await request.get(api('livechat/sla')).set(credentials).expect('Content-Type', 'application/json').expect(200);
			expect(response.body).to.have.property('success', true);
			expect(response.body.sla).to.be.an('array').with.lengthOf.greaterThan(0);
			const current = response.body.sla.find((p: IOmnichannelServiceLevelAgreements) => p && p?._id === sla._id);
			expect(current).to.be.an('object');
			expect(current).to.have.property('name', sla.name);
			expect(current).to.have.property('description', sla.description);
			expect(current).to.have.property('dueTimeInMinutes', sla.dueTimeInMinutes);
		});
	});

	describe('livechat/sla/:slaId', () => {
		it('should return an "unauthorized error" when the user does not have the necessary permission', async () => {
			await updatePermission('manage-livechat-priorities', []);
			await updatePermission('view-l-room', []);
			const response = await request.get(api('livechat/sla/123')).set(credentials).expect('Content-Type', 'application/json').expect(403);
			expect(response.body).to.have.property('success', false);
		});
		it('should return a sla', async () => {
			await updatePermission('manage-livechat-priorities', ['admin']);
			await updatePermission('view-l-room', ['livechat-agent']);
			const sla = await saveSLA();
			const response = await request
				.get(api(`livechat/sla/${sla._id}`))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200);
			expect(response.body).to.have.property('success', true);
			expect(response.body).to.be.an('object');
			expect(response.body._id).to.be.equal(sla._id);
		});
	});
	describe('livechat/priority', () => {
		it('should fail to create a priority from lack of permissions', async () => {
			await updatePermission('manage-livechat-priorities', []);
			await updatePermission('view-l-room', []);
			const priority = await savePriority();
			expect(priority).to.be.undefined;
		});
		it('should create a priority with a POST request', async () => {
			await updatePermission('manage-livechat-priorities', ['admin', 'livechat-manager']);
			await updatePermission('view-l-room', ['admin', 'livechat-manager', 'livechat-agent']);
			const priority = await savePriority();
			expect(priority.name).to.be.string;
			expect(priority.level).to.be.string;
		});
	});

	describe('livechat/priorities', () => {
		let priority: ILivechatPriority;
		it('should return an "unauthorized error" when the user does not have the necessary permission', async () => {
			await updatePermission('manage-livechat-priorities', []);
			await updatePermission('view-l-room', []);
			const response = await request
				.get(api('livechat/priorities'))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(403);
			expect(response.body).to.have.property('success', false);
		});
		it('should return an array of priorities', async () => {
			await updatePermission('manage-livechat-priorities', ['admin', 'livechat-manager']);
			await updatePermission('view-l-room', ['livechat-agent']);
			priority = await savePriority();
			const response = await request
				.get(api('livechat/priorities'))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200);
			expect(response.body).to.have.property('success', true);
			expect(response.body.priorities).to.be.an('array');
			expect(response.body.priorities).to.have.length.greaterThan(0);
			expect(response.body.priorities.find((p: ILivechatPriority) => !!p && p?._id === priority._id)).to.be.an('object');
		});
		it('should not create the same priority twice', async () => {
			await updatePermission('manage-livechat-priorities', ['admin', 'livechat-manager']);
			await updatePermission('view-l-room', ['livechat-agent']);
			priority = await savePriority({ name: priority.name, level: priority.level });
			expect(priority).to.be.undefined;
		});
	});

	describe('livechat/priority/:priorityId', () => {
		it('should return an "unauthorized error" when the user does not have the necessary permission', async () => {
			await updatePermission('manage-livechat-priorities', []);
			await updatePermission('view-l-room', []);
			const response = await request.get(api('livechat/priority/123')).set(credentials).expect(403);
			expect(response.body).to.have.property('success', false);
		});
		it('should return a priority', async () => {
			await updatePermission('manage-livechat-priorities', ['admin', 'livechat-manager']);
			await updatePermission('view-l-room', ['livechat-agent']);
			const priority = await savePriority();
			const response = await request
				.get(api(`livechat/priority/${priority._id}`))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200);
			expect(response.body).to.have.property('success', true);
			expect(response.body).to.be.an('object');
			expect(response.body._id).to.be.equal(priority._id);
		});
	});

	describe('livechat/inquiry.prioritize', () => {
		it('should return an "unauthorized error" when the user does not have the necessary permission', async () => {
			await updatePermission('manage-livechat-priorities', []);
			await updatePermission('view-l-room', []);
			const response = await request
				.put(api('livechat/inquiry.prioritize'))
				.set(credentials)
				.send({
					roomId: '123',
					sla: '123',
				})
				.expect('Content-Type', 'application/json')
				.expect(403);
			expect(response.body).to.have.property('success', false);
		});
		it('should fail if roomId is not in request body', async () => {
			await updatePermission('manage-livechat-priorities', ['admin']);
			await updatePermission('view-l-room', ['livechat-agent']);
			const response = await request
				.put(api('livechat/inquiry.prioritize'))
				.set(credentials)
				.send({
					sla: '123',
				})
				.expect('Content-Type', 'application/json')
				.expect(400);
			expect(response.body).to.have.property('success', false);
		});
		it('should fail if roomId is invalid', async () => {
			const response = await request
				.put(api('livechat/inquiry.prioritize'))
				.set(credentials)
				.send({
					roomId: '123',
					sla: '123',
				})
				.expect('Content-Type', 'application/json')
				.expect(400);
			expect(response.body).to.have.property('success', false);
		});
		it('should fail if sla is not in request body', async () => {
			const response = await request
				.put(api('livechat/inquiry.prioritize'))
				.set(credentials)
				.send({
					roomId: '123',
				})
				.expect('Content-Type', 'application/json')
				.expect(400);
			expect(response.body).to.have.property('success', false);
		});
		it('should fail if sla is not valid', async () => {
			const visitor = await createVisitor();
			const room = await createLivechatRoom(visitor.token);
			await createAgent();

			const response = await request
				.put(api('livechat/inquiry.prioritize'))
				.set(credentials)
				.send({
					roomId: room._id,
					sla: '123',
				})
				.expect('Content-Type', 'application/json')
				.expect(400);
			expect(response.body).to.have.property('success', false);
		});
		it('should fail if inquiry is not queued', async () => {
			const visitor = await createVisitor();
			const room = await createLivechatRoom(visitor.token);
			await takeInquiry(room._id);

			const response = await request
				.put(api('livechat/inquiry.prioritize'))
				.set(credentials)
				.send({
					roomId: room._id,
					sla: '123',
				})
				.expect('Content-Type', 'application/json')
				.expect(400);
			expect(response.body).to.have.property('success', false);
		});
		it('should prioritize an inquiry', async () => {
			const visitor = await createVisitor();
			const room = await createLivechatRoom(visitor.token);
			const sla = await saveSLA();
			const response = await request
				.put(api('livechat/inquiry.prioritize'))
				.set(credentials)
				.send({
					roomId: room._id,
					sla: sla._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200);
			expect(response.body).to.have.property('success', true);
		});
	});
});
