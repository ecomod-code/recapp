import {
	ActorUri,
	Comment,
	CommentActorMessage,
	CommentActorMessages,
	CommentDeletedMessage,
	CommentUpdateMessage,
	Id,
	commentSchema,
} from "@recapp/models";
import { CollecionSubscription, SubscribableActor } from "./SubscribableActor";
import { ActorRef, ActorSystem } from "ts-actors";
import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { create } from "mutative";
import { pick } from "rambda";
import { v4 } from "uuid";

type State = {
	cache: Map<Id, Comment>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Map<ActorUri, CollecionSubscription>;
	lastSeen: Map<ActorUri, Timestamp>;
	lastTouched: Map<Id, Timestamp>;
};

type ResultType = Unit | Error | Comment | Id;

/**
 * Actor representing the comments of a single quiz. This will be started as a child of the corresponding quiz actor
 */
export class CommentActor extends SubscribableActor<Comment, CommentActorMessage, ResultType> {
	// private questionActors = new Map<Id, ActorRef>();

	protected override state: State = {
		cache: new Map(),
		subscribers: new Map(),
		collectionSubscribers: new Map(),
		lastSeen: new Map(),
		lastTouched: new Map(),
	};

	protected override updateIndices(_draft: State, _quiz: Comment): void {
		return;
	}

	constructor(
		name: string,
		system: ActorSystem,
		private uid: Id
	) {
		super(name, system, "comments");
	}

	public async receive(from: ActorRef, message: CommentActorMessage): Promise<ResultType> {
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		if (typeof message === "string" && message === "SHUTDOWN") {
			this.shutdown();
		}
		console.log("COMMENTACTOR", from.name, message);
		try {
			return await CommentActorMessages.match<Promise<ResultType>>(message, {
				Create: async comment => {
					(comment as Comment).uid = v4() as Id;
					const commentToCreate = commentSchema.parse(comment);
					await this.storeEntity(commentToCreate);
					for (const [subscriber, subscription] of this.state.collectionSubscribers) {
						this.send(
							subscriber,
							new CommentUpdateMessage(
								subscription.properties.length > 0
									? pick(subscription.properties, commentToCreate)
									: commentToCreate
							)
						);
					}
					for (const subscriber of this.state.subscribers.get(commentToCreate.uid) ?? new Set()) {
						this.send(subscriber, new CommentUpdateMessage(commentToCreate));
					}
					return commentToCreate.uid;
				},
				Upvote: async ({ commentId, userId }) => {
					const existingComment = await this.getEntity(commentId);
					return existingComment
						.map<Promise<Comment | Error>>(async commentToUpdate => {
							if (commentToUpdate.upvoters.some(u => u === userId)) {
								commentToUpdate.upvoters = commentToUpdate.upvoters.filter(u => u !== userId);
							} else {
								commentToUpdate.upvoters.push(userId);
							}
							commentToUpdate.updated = toTimestamp();
							await this.storeEntity(commentToUpdate);
							for (const [subscriber, subscription] of this.state.collectionSubscribers) {
								this.send(
									subscriber,
									new CommentUpdateMessage(
										subscription.properties.length > 0
											? pick(subscription.properties, commentToUpdate)
											: commentToUpdate
									)
								);
							}
							for (const subscriber of this.state.subscribers.get(commentToUpdate.uid) ?? new Set()) {
								this.send(subscriber, new CommentUpdateMessage(commentToUpdate));
							}
							return commentToUpdate;
						})
						.orElse(Promise.resolve(new Error("Comment not found")));
				},
				Update: async comment => {
					const existingComment = await this.getEntity(comment.uid);
					return existingComment
						.map(async c => {
							if (["TEACHER", "ADMIN"].includes(clientUserRole) && clientUserId !== c.authorId) {
								return new Error("Invalid write access to comment");
							}
							comment.updated = toTimestamp();
							const { relatedQuiz, relatedQuestion, created, authorId, authorName, ...updateDelta } =
								comment;
							const commentToUpdate = commentSchema.parse({ ...c, ...updateDelta });
							await this.storeEntity(commentToUpdate);
							for (const [subscriber, subscription] of this.state.collectionSubscribers) {
								this.send(
									subscriber,
									new CommentUpdateMessage(
										subscription.properties.length > 0
											? pick(subscription.properties, commentToUpdate)
											: commentToUpdate
									)
								);
							}
							for (const subscriber of this.state.subscribers.get(commentToUpdate.uid) ?? new Set()) {
								this.send(subscriber, new CommentUpdateMessage(commentToUpdate));
							}
							return commentToUpdate;
						})
						.orElse(Promise.resolve(new Error("Comment not found")));
				},
				GetAll: async () => {
					const db = await this.connector.db();
					const comments = await db
						.collection<Comment>(this.collectionName)
						.find({ relatedQuiz: this.uid })
						.toArray();
					comments.forEach(comment => {
						const { _id, ...rest } = comment;
						this.send(from, new CommentUpdateMessage(rest));
					});
					return unit();
				},
				SubscribeToCollection: async () => {
					this.state = create(this.state, draft => {
						draft.lastSeen.set(from.name as ActorUri, toTimestamp());
						draft.collectionSubscribers.set(from.name as ActorUri, {
							properties: [],
							userId: clientUserId,
							userRole: clientUserRole,
						});
					});
					return unit();
				},
				UnsubscribeFromCollection: async () => {
					this.state = create(this.state, draft => {
						draft.collectionSubscribers.delete(from.name as ActorUri);
					});
					return unit();
				},
				Delete: async id => {
					const existingComment = await this.getEntity(id);
					return await existingComment
						.map(async c => {
							if (!["TEACHER", "ADMIN"].includes(clientUserRole) && clientUserId !== c.authorId) {
								return new Error("Invalid write access to comment");
							}

							await this.deleteEntity(id);
							for (const [subscriber] of this.state.collectionSubscribers) {
								this.send(subscriber, new CommentDeletedMessage(id));
							}
							for (const subscriber of this.state.subscribers.get(id) ?? new Set()) {
								this.send(subscriber, new CommentDeletedMessage(id));
							}
							return unit();
						})
						.orElse(Promise.resolve(unit()));
				},
			});
		} catch (e) {
			console.error(e);
			throw e;
		}
	}
}
