#include<iostream>
using namespace std;
class Node {
    public:
   int data;
   Node* next;
   Node(int data){
    this->data=data;
    this->next=NULL;
   }
   ~Node(){

    if(this->next!=NULL){
         this->next=NULL;
    }
    cout<<" memory is free for node having value "<<this->data<<endl;
    
   }
};
class Stack{
    public:
    Node *head;
    Stack(){
        head=NULL;
    }
    void push(int value){
        if(head==NULL){
            Node *newNode=new Node(value);
            head=newNode;
        }
        else{
            Node* newNode=new Node(value);
            newNode->next=head;
            head=newNode;
        }
    }

    void pop(){

        if(head==NULL){
            cout<<" Stack Is Empty "<<endl;
        }
       else{
         Node *nodeToDelete=head;
         head=head->next;
         delete nodeToDelete;
       }

    }

    bool empty(){
        return head==NULL;
    }
    int top(){

    if(head==NULL){
        return -1;
    }
     return head->data;

    }
};
int main(){
    Stack s1;
    s1.pop();
    cout<<" "<<s1.empty()<<endl;
    s1.push(23);
    cout<<s1.empty()<<endl;
    s1.push(21);
    s1.push(321);
    cout<<s1.top()<<endl;
    s1.pop();
    cout<<s1.top()<<endl;
    s1.push(100);
    cout<<s1.top()<<endl;
    return 0;
}