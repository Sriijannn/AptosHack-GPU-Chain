module gpu_chain::compute_reward {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};

    // Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_TASK_NOT_FOUND: u64 = 3;
    const E_NOT_AUTHORIZED: u64 = 4;
    const E_INVALID_STATUS: u64 = 5;
    const E_INSUFFICIENT_PAYMENT: u64 = 6;
    const E_DEADLINE_PASSED: u64 = 7;
    const E_ALREADY_REGISTERED: u64 = 8;
    const E_NOT_REGISTERED: u64 = 9;
    const E_NO_REWARDS: u64 = 10;

    // Constants
    const MIN_REWARD: u64 = 1000000; // 0.01 APT in octas
    const PLATFORM_FEE_PERCENT: u64 = 5;

    // Task status
    const TASK_PENDING: u8 = 0;
    const TASK_ASSIGNED: u8 = 1;
    const TASK_COMPLETED: u8 = 2;
    const TASK_VERIFIED: u8 = 3;
    const TASK_DISPUTED: u8 = 4;
    const TASK_CANCELLED: u8 = 5;

    // Structs
    struct ComputeTask has store, drop, copy {
        task_id: u64,
        requester: address,
        worker: Option<address>,
        task_hash: String,
        reward_amount: u64,
        deadline: u64,
        status: u8,
        result_hash: String,
        created_at: u64,
        completed_at: u64,
    }

    struct WorkerInfo has store, drop, copy {
        peer_id: String,
        reputation: u64,
        is_registered: bool,
    }

    // Global state resource
    struct GlobalState has key {
        tasks: Table<u64, ComputeTask>,
        workers: Table<address, WorkerInfo>,
        peer_id_to_worker: Table<String, address>,
        worker_rewards: Table<address, u64>,
        next_task_id: u64,
        total_tasks_created: u64,
        total_tasks_completed: u64,
        total_rewards_distributed: u64,
        platform_fees: u64,
    }

    // Event structures
    struct TaskCreatedEvent has drop, store {
        task_id: u64,
        requester: address,
        reward_amount: u64,
    }

    struct TaskAssignedEvent has drop, store {
        task_id: u64,
        worker: address,
    }

    struct TaskCompletedEvent has drop, store {
        task_id: u64,
        result_hash: String,
    }

    struct TaskVerifiedEvent has drop, store {
        task_id: u64,
        worker: address,
        reward_amount: u64,
    }

    struct WorkerRegisteredEvent has drop, store {
        worker: address,
        peer_id: String,
    }

    // Event handles resource
    struct EventStore has key {
        task_created_events: EventHandle<TaskCreatedEvent>,
        task_assigned_events: EventHandle<TaskAssignedEvent>,
        task_completed_events: EventHandle<TaskCompletedEvent>,
        task_verified_events: EventHandle<TaskVerifiedEvent>,
        worker_registered_events: EventHandle<WorkerRegisteredEvent>,
    }

    // Initialize the module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<GlobalState>(admin_addr), error::already_exists(E_ALREADY_INITIALIZED));
        
        move_to(admin, GlobalState {
            tasks: table::new(),
            workers: table::new(),
            peer_id_to_worker: table::new(),
            worker_rewards: table::new(),
            next_task_id: 1,
            total_tasks_created: 0,
            total_tasks_completed: 0,
            total_rewards_distributed: 0,
            platform_fees: 0,
        });

        move_to(admin, EventStore {
            task_created_events: account::new_event_handle<TaskCreatedEvent>(admin),
            task_assigned_events: account::new_event_handle<TaskAssignedEvent>(admin),
            task_completed_events: account::new_event_handle<TaskCompletedEvent>(admin),
            task_verified_events: account::new_event_handle<TaskVerifiedEvent>(admin),
            worker_registered_events: account::new_event_handle<WorkerRegisteredEvent>(admin),
        });
    }

    // Register as a worker
    public entry fun register_worker(
        worker: &signer,
        peer_id: String,
        admin_addr: address,
    ) acquires GlobalState, EventStore {
        let worker_addr = signer::address_of(worker);
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        let event_store = borrow_global_mut<EventStore>(admin_addr);
        
        assert!(!table::contains(&global_state.workers, worker_addr), error::already_exists(E_ALREADY_REGISTERED));
        assert!(!table::contains(&global_state.peer_id_to_worker, peer_id), error::already_exists(E_ALREADY_REGISTERED));
        
        let worker_info = WorkerInfo {
            peer_id,
            reputation: 50,
            is_registered: true,
        };
        
        table::add(&mut global_state.workers, worker_addr, worker_info);
        table::add(&mut global_state.peer_id_to_worker, peer_id, worker_addr);
        table::add(&mut global_state.worker_rewards, worker_addr, 0);
        
        event::emit_event(&mut event_store.worker_registered_events, WorkerRegisteredEvent {
            worker: worker_addr,
            peer_id,
        });
    }

    // Create a task (simplified - no payment handling for now)
    public entry fun create_task(
        requester: &signer,
        task_hash: String,
        deadline: u64,
        admin_addr: address,
    ) acquires GlobalState, EventStore {
        let requester_addr = signer::address_of(requester);
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        let event_store = borrow_global_mut<EventStore>(admin_addr);
        
        let task_id = global_state.next_task_id;
        global_state.next_task_id = global_state.next_task_id + 1;
        
        let reward_amount = MIN_REWARD; // For demo, use minimum reward
        
        let task = ComputeTask {
            task_id,
            requester: requester_addr,
            worker: option::none(),
            task_hash,
            reward_amount,
            deadline,
            status: TASK_PENDING,
            result_hash: string::utf8(b""),
            created_at: timestamp::now_seconds(),
            completed_at: 0,
        };
        
        table::add(&mut global_state.tasks, task_id, task);
        global_state.total_tasks_created = global_state.total_tasks_created + 1;
        
        event::emit_event(&mut event_store.task_created_events, TaskCreatedEvent {
            task_id,
            requester: requester_addr,
            reward_amount,
        });
    }

    // Assign task to worker
    public entry fun assign_task(
        caller: &signer,
        task_id: u64,
        worker_addr: address,
        admin_addr: address,
    ) acquires GlobalState, EventStore {
        let caller_addr = signer::address_of(caller);
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        let event_store = borrow_global_mut<EventStore>(admin_addr);
        
        assert!(table::contains(&global_state.tasks, task_id), error::not_found(E_TASK_NOT_FOUND));
        
        let task = table::borrow_mut(&mut global_state.tasks, task_id);
        assert!(task.status == TASK_PENDING, error::invalid_state(E_INVALID_STATUS));
        assert!(table::contains(&global_state.workers, worker_addr), error::not_found(E_NOT_REGISTERED));
        assert!(
            caller_addr == task.requester || caller_addr == worker_addr,
            error::permission_denied(E_NOT_AUTHORIZED)
        );
        
        task.worker = option::some(worker_addr);
        task.status = TASK_ASSIGNED;
        
        event::emit_event(&mut event_store.task_assigned_events, TaskAssignedEvent {
            task_id,
            worker: worker_addr,
        });
    }

    // Submit task result
    public entry fun submit_result(
        worker: &signer,
        task_id: u64,
        result_hash: String,
        admin_addr: address,
    ) acquires GlobalState, EventStore {
        let worker_addr = signer::address_of(worker);
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        let event_store = borrow_global_mut<EventStore>(admin_addr);
        
        assert!(table::contains(&global_state.tasks, task_id), error::not_found(E_TASK_NOT_FOUND));
        
        let task = table::borrow_mut(&mut global_state.tasks, task_id);
        assert!(option::contains(&task.worker, &worker_addr), error::permission_denied(E_NOT_AUTHORIZED));
        assert!(task.status == TASK_ASSIGNED, error::invalid_state(E_INVALID_STATUS));
        assert!(timestamp::now_seconds() <= task.deadline, error::invalid_state(E_DEADLINE_PASSED));
        
        task.result_hash = result_hash;
        task.status = TASK_COMPLETED;
        task.completed_at = timestamp::now_seconds();
        
        event::emit_event(&mut event_store.task_completed_events, TaskCompletedEvent {
            task_id,
            result_hash,
        });
    }

    // Verify task completion
    public entry fun verify_task(
        requester: &signer,
        task_id: u64,
        admin_addr: address,
    ) acquires GlobalState, EventStore {
        let requester_addr = signer::address_of(requester);
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        let event_store = borrow_global_mut<EventStore>(admin_addr);
        
        assert!(table::contains(&global_state.tasks, task_id), error::not_found(E_TASK_NOT_FOUND));
        
        let task = table::borrow_mut(&mut global_state.tasks, task_id);
        assert!(task.requester == requester_addr, error::permission_denied(E_NOT_AUTHORIZED));
        assert!(task.status == TASK_COMPLETED, error::invalid_state(E_INVALID_STATUS));
        
        task.status = TASK_VERIFIED;
        global_state.total_tasks_completed = global_state.total_tasks_completed + 1;
        
        // Update worker rewards
        let worker_addr = *option::borrow(&task.worker);
        let current_rewards = *table::borrow(&global_state.worker_rewards, worker_addr);
        table::upsert(&mut global_state.worker_rewards, worker_addr, current_rewards + task.reward_amount);
        
        // Update worker reputation
        let worker_info = table::borrow_mut(&mut global_state.workers, worker_addr);
        if (worker_info.reputation < 100) {
            worker_info.reputation = worker_info.reputation + 1;
        };
        
        event::emit_event(&mut event_store.task_verified_events, TaskVerifiedEvent {
            task_id,
            worker: worker_addr,
            reward_amount: task.reward_amount,
        });
    }

    // Claim worker rewards (simplified - no actual coin transfer for now)
    public entry fun claim_rewards(
        worker: &signer,
        admin_addr: address,
    ) acquires GlobalState {
        let worker_addr = signer::address_of(worker);
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        
        assert!(table::contains(&global_state.worker_rewards, worker_addr), error::not_found(E_NO_REWARDS));
        
        let reward_amount = *table::borrow(&global_state.worker_rewards, worker_addr);
        assert!(reward_amount > 0, error::invalid_state(E_NO_REWARDS));
        
        table::upsert(&mut global_state.worker_rewards, worker_addr, 0);
        global_state.total_rewards_distributed = global_state.total_rewards_distributed + reward_amount;
        
        // Note: In a full implementation, you'd transfer APT coins here
        // For now, we just update the accounting
    }

    // View functions
    #[view]
    public fun get_task(task_id: u64, admin_addr: address): ComputeTask acquires GlobalState {
        let global_state = borrow_global<GlobalState>(admin_addr);
        assert!(table::contains(&global_state.tasks, task_id), error::not_found(E_TASK_NOT_FOUND));
        *table::borrow(&global_state.tasks, task_id)
    }

    #[view]
    public fun get_worker_info(worker_addr: address, admin_addr: address): (bool, String, u64, u64) acquires GlobalState {
        let global_state = borrow_global<GlobalState>(admin_addr);
        
        if (!table::contains(&global_state.workers, worker_addr)) {
            return (false, string::utf8(b""), 0, 0)
        };
        
        let worker_info = table::borrow(&global_state.workers, worker_addr);
        let pending_rewards = if (table::contains(&global_state.worker_rewards, worker_addr)) {
            *table::borrow(&global_state.worker_rewards, worker_addr)
        } else {
            0
        };
        
        (worker_info.is_registered, worker_info.peer_id, worker_info.reputation, pending_rewards)
    }

    #[view]
    public fun get_platform_stats(admin_addr: address): (u64, u64, u64, u64) acquires GlobalState {
        let global_state = borrow_global<GlobalState>(admin_addr);
        (
            global_state.total_tasks_created,
            global_state.total_tasks_completed, 
            global_state.total_rewards_distributed,
            global_state.platform_fees
        )
    }

    #[view]
    public fun get_available_tasks(admin_addr: address, limit: u64): vector<u64> acquires GlobalState {
        let global_state = borrow_global<GlobalState>(admin_addr);
        let available_tasks = vector::empty<u64>();
        let count = 0;
        let current_time = timestamp::now_seconds();
        
        let i = 1;
        while (i < global_state.next_task_id && count < limit) {
            if (table::contains(&global_state.tasks, i)) {
                let task = table::borrow(&global_state.tasks, i);
                if (task.status == TASK_PENDING && task.deadline > current_time) {
                    vector::push_back(&mut available_tasks, i);
                    count = count + 1;
                };
            };
            i = i + 1;
        };
        
        available_tasks
    }
}