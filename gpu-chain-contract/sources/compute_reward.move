module gpu_chain::compute_reward {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
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
    const E_INSUFFICIENT_BALANCE: u64 = 11;
    const E_ESCROW_FAILED: u64 = 12;
    const E_INVALID_AMOUNT: u64 = 13;

    // Constants
    const MIN_REWARD: u64 = 1000000; // 0.01 APT in octas
    const PLATFORM_FEE_PERCENT: u64 = 5;
    const MAX_DEADLINE_HOURS: u64 = 168; // 1 week max

    // Task status
    const TASK_PENDING: u8 = 0;
    const TASK_ASSIGNED: u8 = 1;
    const TASK_COMPLETED: u8 = 2;
    const TASK_VERIFIED: u8 = 3;
    const TASK_DISPUTED: u8 = 4;
    const TASK_CANCELLED: u8 = 5;
    const TASK_REFUNDED: u8 = 6;

    // Structs
    struct ComputeTask has store, drop, copy {
        task_id: u64,
        requester: address,
        worker: Option<address>,
        task_hash: String,
        reward_amount: u64,
        platform_fee: u64,
        total_locked: u64,
        deadline: u64,
        status: u8,
        result_hash: String,
        created_at: u64,
        completed_at: u64,
        dispute_deadline: u64,
    }

    struct WorkerInfo has store, drop, copy {
        peer_id: String,
        reputation: u64,
        is_registered: bool,
        total_tasks_completed: u64,
        total_earnings: u64,
    }

    // Escrow for holding task payments
    struct TaskEscrow has key {
        locked_funds: Table<u64, coin::Coin<AptosCoin>>, // task_id -> locked coins
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
        admin: address,
    }

    // Event structures
    struct TaskCreatedEvent has drop, store {
        task_id: u64,
        requester: address,
        reward_amount: u64,
        total_locked: u64,
        deadline: u64,
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

    struct TaskCancelledEvent has drop, store {
        task_id: u64,
        reason: String,
    }

    struct TaskDisputedEvent has drop, store {
        task_id: u64,
        disputer: address,
        reason: String,
    }

    struct WorkerRegisteredEvent has drop, store {
        worker: address,
        peer_id: String,
    }

    struct FundsReleasedEvent has drop, store {
        task_id: u64,
        recipient: address,
        amount: u64,
    }

    // Event handles resource
    struct EventStore has key {
        task_created_events: EventHandle<TaskCreatedEvent>,
        task_assigned_events: EventHandle<TaskAssignedEvent>,
        task_completed_events: EventHandle<TaskCompletedEvent>,
        task_verified_events: EventHandle<TaskVerifiedEvent>,
        task_cancelled_events: EventHandle<TaskCancelledEvent>,
        task_disputed_events: EventHandle<TaskDisputedEvent>,
        worker_registered_events: EventHandle<WorkerRegisteredEvent>,
        funds_released_events: EventHandle<FundsReleasedEvent>,
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
            admin: admin_addr,
        });

        move_to(admin, TaskEscrow {
            locked_funds: table::new(),
        });

        move_to(admin, EventStore {
            task_created_events: account::new_event_handle<TaskCreatedEvent>(admin),
            task_assigned_events: account::new_event_handle<TaskAssignedEvent>(admin),
            task_completed_events: account::new_event_handle<TaskCompletedEvent>(admin),
            task_verified_events: account::new_event_handle<TaskVerifiedEvent>(admin),
            task_cancelled_events: account::new_event_handle<TaskCancelledEvent>(admin),
            task_disputed_events: account::new_event_handle<TaskDisputedEvent>(admin),
            worker_registered_events: account::new_event_handle<WorkerRegisteredEvent>(admin),
            funds_released_events: account::new_event_handle<FundsReleasedEvent>(admin),
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
            total_tasks_completed: 0,
            total_earnings: 0,
        };
        
        table::add(&mut global_state.workers, worker_addr, worker_info);
        table::add(&mut global_state.peer_id_to_worker, peer_id, worker_addr);
        table::add(&mut global_state.worker_rewards, worker_addr, 0);
        
        event::emit_event(&mut event_store.worker_registered_events, WorkerRegisteredEvent {
            worker: worker_addr,
            peer_id,
        });
    }

    // Create a task with actual payment
    public entry fun create_task(
        requester: &signer,
        task_hash: String,
        reward_amount: u64,
        deadline_hours: u64,
        admin_addr: address,
    ) acquires GlobalState, EventStore, TaskEscrow {
        let requester_addr = signer::address_of(requester);
        
        // Validate inputs
        assert!(reward_amount >= MIN_REWARD, error::invalid_argument(E_INVALID_AMOUNT));
        assert!(deadline_hours > 0 && deadline_hours <= MAX_DEADLINE_HOURS, error::invalid_argument(E_DEADLINE_PASSED));
        
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        let event_store = borrow_global_mut<EventStore>(admin_addr);
        let escrow = borrow_global_mut<TaskEscrow>(admin_addr);
        
        // Calculate platform fee
        let platform_fee = (reward_amount * PLATFORM_FEE_PERCENT) / 100;
        let total_amount = reward_amount + platform_fee;
        
        // Check balance
        let balance = coin::balance<AptosCoin>(requester_addr);
        assert!(balance >= total_amount, error::invalid_state(E_INSUFFICIENT_BALANCE));
        
        let task_id = global_state.next_task_id;
        global_state.next_task_id = global_state.next_task_id + 1;
        
        let deadline = timestamp::now_seconds() + (deadline_hours * 3600);
        
        // Lock funds in escrow
        let payment = coin::withdraw<AptosCoin>(requester, total_amount);
        table::add(&mut escrow.locked_funds, task_id, payment);
        
        let task = ComputeTask {
            task_id,
            requester: requester_addr,
            worker: option::none(),
            task_hash,
            reward_amount,
            platform_fee,
            total_locked: total_amount,
            deadline,
            status: TASK_PENDING,
            result_hash: string::utf8(b""),
            created_at: timestamp::now_seconds(),
            completed_at: 0,
            dispute_deadline: 0,
        };
        
        table::add(&mut global_state.tasks, task_id, task);
        global_state.total_tasks_created = global_state.total_tasks_created + 1;
        
        event::emit_event(&mut event_store.task_created_events, TaskCreatedEvent {
            task_id,
            requester: requester_addr,
            reward_amount,
            total_locked: total_amount,
            deadline,
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
        assert!(timestamp::now_seconds() <= task.deadline, error::invalid_state(E_DEADLINE_PASSED));
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
        // Set dispute deadline (24 hours after completion)
        task.dispute_deadline = timestamp::now_seconds() + 86400;
        
        event::emit_event(&mut event_store.task_completed_events, TaskCompletedEvent {
            task_id,
            result_hash,
        });
    }

    // Verify task completion and release payment
    public entry fun verify_task(
        requester: &signer,
        task_id: u64,
        admin_addr: address,
    ) acquires GlobalState, EventStore, TaskEscrow {
        let requester_addr = signer::address_of(requester);
        
        release_payment_internal(task_id, requester_addr, true, admin_addr);
    }

    // Auto-release payment after dispute deadline
    public entry fun auto_release_payment(
        task_id: u64,
        admin_addr: address,
    ) acquires GlobalState, EventStore, TaskEscrow {
        let global_state = borrow_global<GlobalState>(admin_addr);
        assert!(table::contains(&global_state.tasks, task_id), error::not_found(E_TASK_NOT_FOUND));
        
        let task = table::borrow(&global_state.tasks, task_id);
        assert!(task.status == TASK_COMPLETED, error::invalid_state(E_INVALID_STATUS));
        assert!(timestamp::now_seconds() > task.dispute_deadline, error::invalid_state(E_DEADLINE_PASSED));
        
        release_payment_internal(task_id, task.requester, false, admin_addr);
    }

    // Internal function to release payment
    fun release_payment_internal(
        task_id: u64,
        caller: address,
        manual_verification: bool,
        admin_addr: address,
    ) acquires GlobalState, EventStore, TaskEscrow {
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        let event_store = borrow_global_mut<EventStore>(admin_addr);
        let escrow = borrow_global_mut<TaskEscrow>(admin_addr);
        
        assert!(table::contains(&global_state.tasks, task_id), error::not_found(E_TASK_NOT_FOUND));
        
        let task = table::borrow_mut(&mut global_state.tasks, task_id);
        
        if (manual_verification) {
            assert!(task.requester == caller, error::permission_denied(E_NOT_AUTHORIZED));
            assert!(task.status == TASK_COMPLETED, error::invalid_state(E_INVALID_STATUS));
        };
        
        task.status = TASK_VERIFIED;
        global_state.total_tasks_completed = global_state.total_tasks_completed + 1;
        
        // Release payment from escrow
        let worker_addr = *option::borrow(&task.worker);
        let locked_payment = table::remove(&mut escrow.locked_funds, task_id);
        
        // Split payment
        let platform_fee_coins = coin::extract(&mut locked_payment, task.platform_fee);
        let worker_payment = locked_payment; // Remaining amount goes to worker
        
        // Deposit to accounts
        coin::deposit(worker_addr, worker_payment);
        coin::deposit(admin_addr, platform_fee_coins);
        
        // Update statistics
        global_state.platform_fees = global_state.platform_fees + task.platform_fee;
        global_state.total_rewards_distributed = global_state.total_rewards_distributed + task.reward_amount;
        
        // Update worker info
        let worker_info = table::borrow_mut(&mut global_state.workers, worker_addr);
        worker_info.total_tasks_completed = worker_info.total_tasks_completed + 1;
        worker_info.total_earnings = worker_info.total_earnings + task.reward_amount;
        if (worker_info.reputation < 100) {
            worker_info.reputation = worker_info.reputation + 1;
        };
        
        event::emit_event(&mut event_store.task_verified_events, TaskVerifiedEvent {
            task_id,
            worker: worker_addr,
            reward_amount: task.reward_amount,
        });
        
        event::emit_event(&mut event_store.funds_released_events, FundsReleasedEvent {
            task_id,
            recipient: worker_addr,
            amount: task.reward_amount,
        });
    }

    // Cancel task and refund payment
    public entry fun cancel_task(
        requester: &signer,
        task_id: u64,
        reason: String,
        admin_addr: address,
    ) acquires GlobalState, EventStore, TaskEscrow {
        let requester_addr = signer::address_of(requester);
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        let event_store = borrow_global_mut<EventStore>(admin_addr);
        let escrow = borrow_global_mut<TaskEscrow>(admin_addr);
        
        assert!(table::contains(&global_state.tasks, task_id), error::not_found(E_TASK_NOT_FOUND));
        
        let task = table::borrow_mut(&mut global_state.tasks, task_id);
        assert!(task.requester == requester_addr, error::permission_denied(E_NOT_AUTHORIZED));
        assert!(task.status == TASK_PENDING, error::invalid_state(E_INVALID_STATUS));
        
        task.status = TASK_CANCELLED;
        
        // Refund locked payment
        let refund = table::remove(&mut escrow.locked_funds, task_id);
        coin::deposit(requester_addr, refund);
        
        event::emit_event(&mut event_store.task_cancelled_events, TaskCancelledEvent {
            task_id,
            reason,
        });
        
        event::emit_event(&mut event_store.funds_released_events, FundsReleasedEvent {
            task_id,
            recipient: requester_addr,
            amount: task.total_locked,
        });
    }

    // Dispute a task
    public entry fun dispute_task(
        disputer: &signer,
        task_id: u64,
        reason: String,
        admin_addr: address,
    ) acquires GlobalState, EventStore {
        let disputer_addr = signer::address_of(disputer);
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        let event_store = borrow_global_mut<EventStore>(admin_addr);
        
        assert!(table::contains(&global_state.tasks, task_id), error::not_found(E_TASK_NOT_FOUND));
        
        let task = table::borrow_mut(&mut global_state.tasks, task_id);
        assert!(task.status == TASK_COMPLETED, error::invalid_state(E_INVALID_STATUS));
        assert!(timestamp::now_seconds() <= task.dispute_deadline, error::invalid_state(E_DEADLINE_PASSED));
        assert!(
            task.requester == disputer_addr || option::contains(&task.worker, &disputer_addr),
            error::permission_denied(E_NOT_AUTHORIZED)
        );
        
        task.status = TASK_DISPUTED;
        
        event::emit_event(&mut event_store.task_disputed_events, TaskDisputedEvent {
            task_id,
            disputer: disputer_addr,
            reason,
        });
    }

    // Admin function to resolve dispute
    public entry fun resolve_dispute(
        admin: &signer,
        task_id: u64,
        award_to_worker: bool,
        admin_addr: address,
    ) acquires GlobalState, EventStore, TaskEscrow {
        let admin_signer_addr = signer::address_of(admin);
        let global_state = borrow_global<GlobalState>(admin_addr);
        
        assert!(admin_signer_addr == global_state.admin, error::permission_denied(E_NOT_AUTHORIZED));
        assert!(table::contains(&global_state.tasks, task_id), error::not_found(E_TASK_NOT_FOUND));
        
        let task = table::borrow(&global_state.tasks, task_id);
        assert!(task.status == TASK_DISPUTED, error::invalid_state(E_INVALID_STATUS));
        
        if (award_to_worker) {
            release_payment_internal(task_id, admin_signer_addr, false, admin_addr);
        } else {
            // Refund to requester
            refund_task_internal(task_id, admin_addr);
        };
    }

    // Internal function to refund task
    fun refund_task_internal(task_id: u64, admin_addr: address) acquires GlobalState, EventStore, TaskEscrow {
        let global_state = borrow_global_mut<GlobalState>(admin_addr);
        let event_store = borrow_global_mut<EventStore>(admin_addr);
        let escrow = borrow_global_mut<TaskEscrow>(admin_addr);
        
        let task = table::borrow_mut(&mut global_state.tasks, task_id);
        task.status = TASK_REFUNDED;
        
        let refund = table::remove(&mut escrow.locked_funds, task_id);
        coin::deposit(task.requester, refund);
        
        event::emit_event(&mut event_store.funds_released_events, FundsReleasedEvent {
            task_id,
            recipient: task.requester,
            amount: task.total_locked,
        });
    }

    // View functions
    #[view]
    public fun get_task(task_id: u64, admin_addr: address): ComputeTask acquires GlobalState {
        let global_state = borrow_global<GlobalState>(admin_addr);
        assert!(table::contains(&global_state.tasks, task_id), error::not_found(E_TASK_NOT_FOUND));
        *table::borrow(&global_state.tasks, task_id)
    }

    #[view]
    public fun get_worker_info(worker_addr: address, admin_addr: address): (bool, String, u64, u64, u64) acquires GlobalState {
        let global_state = borrow_global<GlobalState>(admin_addr);
        
        if (!table::contains(&global_state.workers, worker_addr)) {
            return (false, string::utf8(b""), 0, 0, 0)
        };
        
        let worker_info = table::borrow(&global_state.workers, worker_addr);
        
        (
            worker_info.is_registered,
            worker_info.peer_id,
            worker_info.reputation,
            worker_info.total_tasks_completed,
            worker_info.total_earnings
        )
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

    #[view]
    public fun get_task_escrow_amount(task_id: u64, admin_addr: address): u64 acquires TaskEscrow {
        let escrow = borrow_global<TaskEscrow>(admin_addr);
        if (table::contains(&escrow.locked_funds, task_id)) {
            coin::value(table::borrow(&escrow.locked_funds, task_id))
        } else {
            0
        }
    }

    #[view]
    public fun get_user_balance(user_addr: address): u64 {
        coin::balance<AptosCoin>(user_addr)
    }

    #[view]
    public fun get_worker_tasks(worker_addr: address, admin_addr: address): vector<u64> acquires GlobalState {
        let global_state = borrow_global<GlobalState>(admin_addr);
        let worker_tasks = vector::empty<u64>();
        
        let i = 1;
        while (i < global_state.next_task_id) {
            if (table::contains(&global_state.tasks, i)) {
                let task = table::borrow(&global_state.tasks, i);
                if (option::contains(&task.worker, &worker_addr)) {
                    vector::push_back(&mut worker_tasks, i);
                };
            };
            i = i + 1;
        };
        
        worker_tasks
    }

    #[view]
    public fun get_requester_tasks(requester_addr: address, admin_addr: address): vector<u64> acquires GlobalState {
        let global_state = borrow_global<GlobalState>(admin_addr);
        let requester_tasks = vector::empty<u64>();
        
        let i = 1;
        while (i < global_state.next_task_id) {
            if (table::contains(&global_state.tasks, i)) {
                let task = table::borrow(&global_state.tasks, i);
                if (task.requester == requester_addr) {
                    vector::push_back(&mut requester_tasks, i);
                };
            };
            i = i + 1;
        };
        
        requester_tasks
    }
}